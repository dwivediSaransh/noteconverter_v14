import { Component,OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialogRef } from '@angular/material/dialog';
import { ModalService} from '../../services/modal.service';
import { environment } from '../../../environments/environment'
import { ProgressAlertComponent } from '../progress-alert/progress-alert.component';
import { ResourcestringService} from '../../services/resourcestring.service';
import { resourceString} from '../../model/global';
import { LogService } from '../../services/log.service';


@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.scss']
})
export class PrivacyPolicyComponent implements OnInit {

  privacyPolicy : string = '';
  showVersion: string = '';
  env = environment;
  resourceString : resourceString[];
 

  constructor(
    private http: HttpClient,
    private modalService : ModalService,
    public modalRef : MatDialogRef<any>,
    private resourceStringService : ResourcestringService,
    private  logService: LogService,
    ){}

  ngOnInit(): void {

    //this.logService.trackTrace("Initialising ngOnInit Privacy policy ");
    const progress =  this.modalService.openModalWithoutClose(ProgressAlertComponent,'','') //this.modalService.showProgressAlert('Alert','');
    const url = this.env.privacyPolicyUrl;
    //this.logService.trackTrace("Before privacy policy open");
    this.http.get(url, {responseType:'text'})
      .subscribe({
          next:(response) => {
          this.privacyPolicy = (response as string);
          //this.showVersion = this.resourceString["VERSION"];
          //this.logService.trackTrace("inside privacy policy subscribe");
          progress.close();
        },
        error:(error) => {
          this.logService.trackTrace("inside privacy policy error"+error);
          this.showVersion = 'v1.0'; //this.strings.VERSION
          progress.close();
          //this.modalService.showGeneralError(error);
        }
    });
    //this.logService.trackTrace("after privacy policy http call");
    }
      
    closeModal():void{
      this.modalService.closeModal(this.modalRef);
    }

    private disableLinks(): void {
      const links = document.getElementsByTagName('a');
      for (let i = 0; i < links.length; i++) {
        links[i].style.pointerEvents = 'none';
      }
    }
  /* disableLinks() :void{
    const links  = this.el.nativeElement.querySelectorAll('a');
     links.array.forEach(link => {
      this.renderer.setStyle(link,'pointer-events','none');
    });
  } */
}
  


