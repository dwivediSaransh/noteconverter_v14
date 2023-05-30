import { Injectable } from '@angular/core';
import { HttpClient,HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ScanOptionsService } from '../../app/services/scan-options.service';
import { JobService } from './job.service';
import { AppComponent } from '../../app/app.component';
import { ModalService } from '../../app/services/modal.service';
import { LogService } from './log.service';
import { ErrorHandlerService } from '../../app/services/error-handler.service';
import { ScanTemplateService } from '../../app/services/scan-template.service';
import {xrxTemplatePutTemplate,xrxTemplateDeleteTemplate}  from  '../../assets/Xrx/XRXTemplate';
import { tap } from 'lodash';
import {xrxStringToDom,xrxGetElementValue} from '../../assets/Xrx/XRXXmlHandler';
import {xrxScanV2InitiateScanJobWithTemplate,xrxScanV2ParseInitiateScanJobWithTemplate} from '../../assets/Xrx/XRXScanV2';
import {xrxJobMgmtGetJobDetails,xrxJobMgmtParseGetJobDetails,xrxJobMgmtParseJobStateReasons} from '../../assets/Xrx/XRXJobManagement';
import {xrxParseJobStateReasons} from '../../assets/Xrx/XRX_EIPWSHelpers';
import {environment} from '../../environments/environment';
import {scanTemplate} from '../../app/model/scantemplate.model';
import {BasicAlertComponent} from '../views/basic-alert/basic-alert.component';
import {ProgressAlertComponent} from '../views/progress-alert/progress-alert.component';
import { resourceString} from '../model/global';
import { ResourcestringService} from '../services/resourcestring.service';

@Injectable({
  providedIn: 'root'
})
export class ScanService {

  private startScanTime: Date | null = null;
  private stopScanTime: Date | null = null;
  private timeoutInMinutes = 1;
  
  isScanning: boolean = false;
  isComplete: boolean = false;

  env = environment;
  scanTemplate : scanTemplate;

  resourceString : resourceString[];

  private printerUrl = this.env.deviceUrl;//127.0.0.1
  private sessionUrl = 'http://127.0.0.1';//http://localhost
  
  constructor(
    
    private http: HttpClient,
    private modalService: ModalService,
    private scanOptionsService: ScanOptionsService,
    private scanTemplateService: ScanTemplateService,
    private logService: LogService,
    private jobService: JobService,
    private errorHandlerService: ErrorHandlerService,
    private appComponent:AppComponent,
    private resourceStringService : ResourcestringService, 
  ) {
    this.resourceString = this.resourceStringService.getObjStrings();
  }

 

  public callbacks = {
    handleScanException: (message: string) => {
      this.callbacks.completeScan({ error: true, message: message });
    },
    handleJobCanceled: () => {
      this.callbacks.completeScan({ error: true, message: 'canceled' });
    },
    handleJobAbortedBySystem: () => {
      this.callbacks.completeScan({ message: 'Scan Job Aborted By System' });
    },
    handleInputSizeNotDetermined: () => {
      this.callbacks.completeScan({ error: true, message: 'Input size not determined' });
    },
    handleJobComplete: () => {
      this.callbacks.completeScan({ message: 'complete' });
    },
    handleFinishPutTemplateError: () => {
      this.callbacks.completeScan({ error: true, message: 'Error sending template to device' });
    },
    handleBeginCheckFailure: (request: any, response: any) => {
      //this.logService.logMsg(response,"Information");
      this.logService.trackException(response);
      //this.logService.logMsg(request,"Information");
      this.logService.trackException(request);
      this.callbacks.completeScan({ error: true, deviceDetails: response });
    },
    handlePutTemplateFailure: (message: string) => {
      this.callbacks.completeScan({ error: true, deviceDetails: message });
    },
    completeScan: (detail: any) => {
      //alert("completescan :" + detail);
      //debugger;
      this.isScanning = false;
      this.isComplete = true;
      if (detail.error) {
        this.completeScanPromise.reject(detail);
      } else {
        this.completeScanPromise.resolve(detail);
      }
    }
  };

  private template: any;
  private completeScanPromise: any = null;
  private jobid: any = null;

  public isExistingEmail(email: string): Observable<any> {
    const config = {
      headers: {
        'Content-Type': 'text/json; charset=utf-8',
        Authorization: 'ED803572-7B6B-4E56-8DCB-9F9C22C679FA'
      }
    };

    return this.http
      .get(`api/IsExistingEmail?email=${email}`, config)
      .pipe(catchError((error) => throwError(error)));
  }



    public scan(model): Promise<void> {
      //this.logService.logMsg('service.scan', 'information');
      this.logService.trackTrace('service.scan');
      if (this.isScanning) {
        //this.logService.logMsg('service.scan -> service.isScanning : Please wait!!!!', 'information');
        this.logService.trackTrace('service.scan -> service.isScanning : Please wait!!!!');
        throw this.resourceString['SDE_PLEASE_WAIT_UNTIL'];
      }

      this.jobid = this.jobService.generateNewJobID();
      //this.logService.logMsg('scanService => scan => jobID:' + this.jobid, 'information');
      this.logService.trackTrace('scanService => scan => jobID:' + this.jobid);

      model.jobid = this.jobid;
      this.scanTemplate = this.scanTemplateService.scanTemplate(model);
      console.log(this.scanTemplate);
      //this.modalService.showProgressAlert(this.resourceString['SDE_SCANNING1'],'');
      this.modalService.openModalWithTitle(ProgressAlertComponent,this.resourceString['SDE_SCANNING1'],'');
  
      return this.jobService.registerJob(model).then((result)=>{ //.toPromise()     
     
          const tStr = this.scanTemplateService.objToString();
          //this.logService.logMsg('scanService => scan => template:' + tStr, 'information');
          this.logService.trackTrace('scanService => scan => template:' + tStr);
          this.isScanning = true;
          this.isComplete = false;
          //function resolve(){alert("inside completescanPromise resolve");}
          //function reject(){alert("inside completescanPromise reject");}
          this.completeScanPromise = new Promise((resolve, reject) => {});
          //this.logService.logMsg('service.scan -> calling putTemplate()', 'information');
          this.logService.trackTrace('service.scan -> calling putTemplate()');
          this.putTemplate(tStr);

         return  this.completeScanPromise;
      });
    };
  
    putTemplate(tStr): Promise<any> {
      return  new Promise((resolve,reject)=>{
      //this.logService.logMsg('putTemplate()...', 'information');
      this.logService.trackTrace('putTemplate()...');
      const printerUrl =  this.env.apiUrl;
      const templateName= this.scanTemplate.name; //templateName
      function finish (callId: any, response: any) {
        //this.logService.logMsg('putTemplate => successCallback', 'information');
        this.logService.trackTrace('putTemplate => successCallback');
        //this.logService.logMsg(`scanService => putTemplate => callId:${callId} response:${response}`, 'information');
        this.logService.trackTrace(`scanService => putTemplate => callId:${callId} response:${response}`);
        this.finishPutTemplate(callId, response,printerUrl,3000);
        const result={};
        resolve (result);
      };
      function fail  (result: any)  {
        //this.logService.logMsg("PutTemplate Error" + result);
        this.logService.trackException(result);
        this.modalService.closeAllModals();
        this.errorHandlerService.APP_UNAVAILABLE_AT_THIS_TIME();
        reject(result);
      };
        xrxTemplatePutTemplate(
          printerUrl,
          templateName,
          tStr,
          finish.bind(this),
          fail.bind(this),
          5000
        );
      });
    }
  
   
    finishPutTemplate(callId: any, response: string, printerUrl: string,  timeoutInMinutes: number):Promise<any>{
      return new Promise((resolve,reject)=>{
        //this.logService.logMsg(`finishPutTemplate(callId,response) -> callId: ${callId} response: ${response}`, 'information');
        this.logService.trackTrace(`finishPutTemplate(callId,response) -> callId: ${callId} response: ${response}`);
        const xmlDoc = xrxStringToDom(response);
        //this.logService.logMsg(`finishPutTemplate(callId,response) -> xmlDoc: ${xmlDoc}`, 'information');
        this.logService.trackTrace(`finishPutTemplate(callId,response) -> xmlDoc: ${xmlDoc}`);
        this.scanTemplate.checkSum = xrxGetElementValue(xmlDoc, 'TemplateChecksum');
        function successCallback  (envelope: any, response: any)  {
          //this.logService.logMsg(`function finish(callId, response) -> callId: ${callId} response: ${response}`, 'information');
          this.logService.trackTrace(`function finish(callId, response) -> callId: ${callId} response: ${response}`);
          let responseJobId : string = xrxScanV2ParseInitiateScanJobWithTemplate(response);
          //this.logService.logMsg("response job Id : "+ responseJobId,"Information");
          this.logService.trackTrace("response job Id : "+ responseJobId);
          this.scanTemplate.jobId = responseJobId;
          //this.logService.logMsg("response scan template job Id : "+ this.scanTemplate.jobId,"Information");
          this.logService.trackTrace("response scan template job Id : "+ this.scanTemplate.jobId);
          // Let everyone know the job has been submitted.
        //$rootScope.$broadcast('scanJobSubmitted', { jobId: template.jobId, template: template });
        // Begin the check loop.
          const startScanTime = new Date();
          const stopScanTime = new Date();
          stopScanTime.setMinutes(stopScanTime.getMinutes() + timeoutInMinutes);
          
          this.beginCheckLoop(this.scanTemplate.jobId);
        };
        function errorCallback  (env: any,message :any)  {
          //this.logService.logMsg(`function fail(env, message) {  -> env: ${env} message: ${message}`, 'information');
          this.logService.trackTrace(`function fail(env, message) {  -> env: ${env} message: ${message}`);
          this.callbacks.handleFinishPutTemplateError();
           this.errorHandlerService.CLOUD_APP_GENERAL_ERROR(); 

        };
        xrxScanV2InitiateScanJobWithTemplate(
        printerUrl,
        this.scanTemplate.name,
        false,
        null,
        successCallback.bind(this),
        errorCallback.bind(this)
        );
      });
  }

  checkScanTimeout(): boolean {
    if (this.startScanTime !== null && this.stopScanTime !== null) {
      return (
        this.stopScanTime.getMinutes() >= this.startScanTime.getMinutes() &&
        this.stopScanTime.getSeconds() > this.startScanTime.getSeconds()
      );
    }
    return false;
  }

  beginCheckLoop(jobid:string): void {
    if (this.isComplete) { return; }
    //this.logService.logMsg('()beginCheckLoop...', 'information'); 
    this.logService.trackTrace('beginCheckLoop()...');
    xrxJobMgmtGetJobDetails(
      this.sessionUrl,
      'WorkflowScanning',
      jobid,
      this.checkLoop.bind(this),
      this.callbacks.handleBeginCheckFailure.bind(this),
      5000,
      true
    );
  }

  checkLoop(request: any, response: any) {

    //this.logService.logMsg('checkLoop(request, response) -> request:' + request + ' response:' + response, 'information');
    this.logService.trackTrace('checkLoop(request, response) -> request:' + request + ' response:' + response);
    // Any job state?
  let jobStateReason = '';
  const info = xrxJobMgmtParseGetJobDetails(response);
  //const serializer = new XMLSerializer();
  //const serializedstring =serializer.serializeToString(response);
  //this.logService.logMsg("xrxJobMgmtParseGetJobDetails library reponse serialized" + serializedstring,"Information");
  const jobState = xrxGetElementValue(info, 'JobState');alert(jobState);
  //this.logService.logMsg("inside checkLoop => jobState : "+jobState)
  const dummy = xrxJobMgmtParseJobStateReasons(response);
  //this.logService.logMsg('checkLoop(request, response) -> jobState:' + jobState + ' dummy:' + dummy, 'information');
    this.logService.trackTrace('checkLoop(request, response) -> jobState:' + jobState + ' dummy:' + dummy);
  if (jobState === null || jobState === 'Completed') {
    //this.logService.logMsg('if (jobState === null || jobState === Completed)', 'information');
    this.logService.trackTrace('if (jobState === null || jobState === Completed)');
    jobStateReason = xrxParseJobStateReasons(response);
    //this.logService.logMsg('xrxParseJobStateReasons response:' + response, 'information');
    //this.logService.logMsg('jobStateReason response:' + jobStateReason, 'information');
  }


  //this method is to be implemented for root scope
  /* $rootScope.$broadcast('jobStatusCheckSuccess', { 
    jobId: this.template.jobId,
    state: jobState,
    reason: jobStateReason
  }); */

  // Update the status of the template.
  this.scanTemplate.status = {
    lastJobState: jobState,
    lastJobStateReason: jobStateReason
  };
  //this.logService.logMsg("scan template status :" + this.scanTemplate.status.lastJobState+", JobstaeReason : "+this.scanTemplate.status.lastJobStateReason, "Information");
  // Checking if the job should be flagged as timeout
  if (this.checkScanTimeout()) {
    //this.logService.logMsg('if (checkScanTimeout()) { ', 'information');
    this.logService.trackTrace('if (checkScanTimeout()) { ');
    this.template.jobState = 'Completed';
    jobStateReason = 'JobAborted';
    this.callbacks.handleJobAbortedBySystem();
    //$timeout(deleteScanTemplate(), 500);
    this.errorHandlerService.DEVICE_EIP_INTERNAL_ERROR_TIMEOUT();
    return;
  }

  if (jobState === 'Completed' && jobStateReason === 'JobCompletedSuccessfully') {
    this.modalService.closeAllModals();

    const title = 'SDE_DOCUMENT_SUCCESSFULLY_SCANNED'; //strings to be replaced from app resources in Web Solution file
    const msg = 'SDE_WILL_RECEIVE_EMAIL2'.replace('{0}', 'Xerox Note Converter');
    this.modalService.openModalWithTitle(BasicAlertComponent,title,msg);//title, msg

    //this.logService.logMsg('if (jobState === Completed && jobStateReason == JobCompletedSuccessfully) { ', 'information');
    this.logService.trackTrace('if (jobState === Completed && jobStateReason == JobCompletedSuccessfully) { ');
    //$rootScope.$broadcast('jobProgress', 'JOB_COMPLETED_SUCCESSFULLY'); to be implemented
  }

  if (jobState === 'Completed' && jobStateReason === 'InputScanSizeNotDetermined') {
    //this.logService.logMsg('if (jobState === Completed && jobStateReason === InputScanSizeNotDetermined) {  jobState:' + jobState + ' jobStateReason:' + jobStateReason, 'information');
    this.logService.trackTrace('if (jobState === Completed && jobStateReason === InputScanSizeNotDetermined) {  jobState:' + jobState + ' jobStateReason:' + jobStateReason);
    this.errorHandlerService.INPUT_SCAN_SIZE_NOT_DETERMINED();
    this.callbacks.handleInputSizeNotDetermined();
    //$timeout(deleteScanTemplate(), 500);  to be implemented
    return;
  }

  if (jobState === 'Completed' && jobStateReason === 'None') {
    // do nothing
  } else if (jobState === 'Completed' && jobStateReason && jobStateReason != 'JobCompletedSuccessfully') {
    //this.logService.logMsg('if (jobState === Completed && jobStateReason && jobStateReason != JobCompletedSuccessfully) {', 'information');
    this.logService.trackTrace('if (jobState === Completed && jobStateReason && jobStateReason != JobCompletedSuccessfully) {');
    // $rootScope.$broadcast('jobProgress', jobStateReason);
    this.modalService.closeAllModals();
    this.errorHandlerService.APP_UNAVAILABLE_AT_THIS_TIME();
    return;
  } else {
    //this.logService.logMsg('jobProgress:' + jobState, 'information');
    this.logService.trackTrace('jobProgress:' + jobState);
    // $rootScope.$broadcast('jobProgress', jobState);
  }

  if (jobState === 'Completed' && jobStateReason == 'JobCompletedSuccessfully') {
    //$timeout(this.callbacks.handleJobComplete(), 500);
    //$timeout(deleteScanTemplate(), 500);
    return;
    }

    else if (jobState === 'Completed' && (jobStateReason === 'JobAborted' || jobStateReason === 'AbortBySystem')) {
      //this.logService.logMsg('else if (jobState === Completed && (jobStateReason === JobAborted || jobStateReason === AbortBySystem)) {', 'information');
      this.logService.trackTrace('else if (jobState === Completed && (jobStateReason === JobAborted || jobStateReason === AbortBySystem)) {')
      this.errorHandlerService.SDE_JOB_CANCELED1();
      this.callbacks.handleJobAbortedBySystem();
      //$timeout(deleteScanTemplate(), 500);
    }
    
    else if (jobState === 'Completed' && (jobStateReason === 'JobCanceledByUser' || jobStateReason === 'CancelByUser')) {
      //this.logService.logMsg('else if (jobState === Completed && (jobStateReason === JobCanceledByUser || jobStateReason === CancelByUser)) {', 'information');
      this.logService.trackTrace('else if (jobState === Completed && (jobStateReason === JobCanceledByUser || jobStateReason === CancelByUser)) {');
      this.errorHandlerService.SDE_JOB_CANCELED1();
      this.callbacks.handleJobCanceled();
      //$timeout(deleteScanTemplate(), 500); this.
    }

    else if (jobState === 'ProcessingStopped' && (jobStateReason === 'NextOriginalWait' || jobStateReason === '')) {
      //this.logService.logMsg('else if ProcessingStopped NextOriginalWait', 'information');
      this.logService.trackTrace('else if ProcessingStopped NextOriginalWait');
      //$timeout(beginCheckLoop, 2000);
    }
    else if (!(jobState === 'Completed' && jobStateReason === "None") && (jobState === 'Completed' || jobState === 'ProcessingStopped')) {
      //this.logService.logMsg('else if Completed ProcessingStopped', 'information');
      this.logService.trackTrace('else if Completed ProcessingStopped');
      //$timeout(service.callbacks.handleJobComplete(), 500);
      //$timeout(deleteScanTemplate(), 500);
    }
    else if (jobState === null && jobStateReason === 'JobCanceledByUser') {
      //this.logService.logMsg('else if JobCanceledBUser', 'information');
      this.logService.trackTrace('else if JobCanceledBUser');
      //$rootScope.$broadcast('jobProgress', jobStateReason);
      this.callbacks.handleJobCanceled();
      //$timeout(deleteScanTemplate(), 500);
      this.errorHandlerService.SDE_JOB_CANCELED1();
    }
    else if (jobState === null && jobStateReason !== '') {
      //this.logService.logMsg('else if (jobState === null && jobStateReason !== ) {  jobStateReason:' + jobStateReason, 'information');
      this.logService.trackTrace('else if (jobState === null && jobStateReason !== ) {  jobStateReason:');
      this.errorHandlerService.SDE_JOB_CANCELED1();
      this.callbacks.handleScanException(jobStateReason);
      //$timeout(deleteScanTemplate(), 500);
    }
    else {
      //$timeout(beginCheckLoop, 2000);
    }
  }

  deleteScanTemplate():void {
    // We can delete the template by checksum if we have it.
    if (this.scanTemplate.checkSum) {

      
      xrxTemplateDeleteTemplate(this.printerUrl, this.scanTemplate.name, this.scanTemplate.checkSum, 
         this.success,
         this.failure
        );
    }
  }

  success(message:any){}

  failure(message:any){}
}

