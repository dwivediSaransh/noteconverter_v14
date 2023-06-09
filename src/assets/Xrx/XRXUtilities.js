/*
* XRXUtiities
* Functions that will be of use and workaround problems on the device.
*
* Version
*   1.0     04/18/13 AHB Create first version with Browser ID, Widget ID and DomAttrEvent functions
*   1.1     05/15/13 AHB Added new utilities: GetCurrentBrowserVersion
*			05/21/2018	TC	Updated comments.
*			05/28/2020  TC  Added browserType().
*							Deprecated xrxIdentifyCurrentBrowser(), xrxGetCurrentBrowserVersion() and
*							getXeroxWidgetVersion().
*							Deprecated the functions for making Asynchronous Ajax Call Indirectly which
*							includes xrxCallWebserviceIndirect(), xrxCallAjaxIndirect(), XRXAjaxParameters(),
*							xrxCallWebserviceContinue() and xrxCallAjaxContinue().
*
*/



//  Identify Current Browser

/**
* This function identifies the browser currently handling the page
*
* @return {number} A numeric value represents the browser type, supported values are:
*					0 (Unknown),
*					1 (firstGenEIPBrowser), 
*					2 (secondGenEIPBrowser),
*					3 (thirdGenEIPBrowser),
*					  
*/
function browserType()
{
	var browserType = 0;
    var uaString = navigator.userAgent || "";
	uaString = uaString.toLowerCase();
	if (uaString.indexOf( "galio" ) >= 0) {
		browserType = 1;
	} 
	else if (uaString.indexOf( "webkit" ) >= 0) {
		if (uaString.indexOf( "x2g" ) >= 0) {
			browserType = 2;
		}  
		else if (uaString.indexOf( "x3g" ) >= 0) {
			browserType = 3;
		}
	}
	return browserType;	
}

/**
* @deprecated since XeroxJavascriptLibrary 4.2.03
*
* This function identifies the browser currently handling the page
*
* @return {string}    "FirstGenBrowser" or "SecondGenBrowser" or "Unknown" or "No User Agent"
*/
function xrxIdentifyCurrentBrowser()
{
    var uaString = navigator.userAgent;
    return (((uaString != undefined) && (uaString != null)) ? (((uaString = uaString.toLowerCase()).indexOf( "galio" ) >= 0) ? 
        "FirstGenBrowser" : ((uaString.indexOf( "webkit" ) >= 0) ? "SecondGenBrowser" : "Unknown" )) : "No User Agent" );
}

//  Get Current Browser Version

/**
* @deprecated since XeroxJavascriptLibrary 4.2.03
*
* This function gets the version of the browser currently handling the page
*
* @return {string}   browser version
*/
function xrxGetCurrentBrowserVersion()
{
    return navigator.appVersion;
}

//  Send DomAttrModified event

/**
* This function initiates a DomAttrEvent for use in the Second Gen EIP Browser which lacks this event.
*
* @param {object}	node				Dom element to generate the event
* @param {boolean}	bubbles             state of bubble through
* @param {boolean}	cancelable          whether event can be cancelled
* @param {string}	attrName            Name of the attribute
* @param {string}	prevValue           Previous value of the attribute or null 
* @param {string}	newValue            New value of the attribute or null 
* @param {string}	[modType="Modification"]	Type of attribute modification 
										Addition, Removal, Modification) (case insensitive)
* @param {boolean}	[ifNecessary=true]	true - function will only execute if 
										current browser is NOT firstGen (default), false - fires anyway
* @return {boolean} True = event was sent, False = failed to process
*/
function xrxSendDomAttrModifiedEvent( node, bubbles, cancelable, attrName, prevValue, newValue, modType, ifNecessary )
{
    if(((ifNecessary != undefined) && !ifNecessary) || (browserType() >= 2))
        return xrxFireDomAttrModifiedEvent( node, bubbles, cancelable, attrName, prevValue, newValue, modType );
    else 
        return false;
}

//  Fire DomAttrModified event

/**
* This function initiates a DomAttrEvent.
*
* @param {object}	node				Dom element to generate the event
* @param {boolean}	bubbles             state of bubble through
* @param {boolean}	cancelable          whether event can be cancelled
* @param {string}	attrName            Name of the attribute
* @param {string}	prevValue           Previous value of the attribute or null 
* @param {string}	newValue            New value of the attribute or null 
* @param {string}	[modType="Modification"]	Type of attribute modification 
										Addition, Removal, Modification) (case insensitive)
* @return {boolean}	True = event was sent, False = failed to process
*/
function xrxFireDomAttrModifiedEvent( node, bubbles, cancelable, attrName, prevValue, newValue, modType )
{
    try
    {
	    var evt = xrxCreateDomAttrModifiedEvent( node, bubbles, cancelable, attrName, prevValue, newValue, modType );
        node.dispatchEvent( evt );
        return true;
    }
    catch(e)
    {
        return false;
    }
}

//  Create DomAttrModified event

/**
* This function creates a DomAttrEvent.
*
* @param {object}	node				Dom element to generate the event
* @param {boolean}	bubbles             state of bubble through
* @param {boolean}	cancelable          whether event can be cancelled
* @param {string}	attrName            Name of the attribute
* @param {string}	prevValue           Previous value of the attribute or null 
* @param {string}	newValue            New value of the attribute or null 
* @param {string}	[modType="Modification"]	Type of attribute modification 
										Addition, Removal, Modification) (case insensitive)
* @return {object}  null if failed, else event created
*/
function xrxCreateDomAttrModifiedEvent( node, bubbles, cancelable, attrName, prevValue, newValue, modType )
{
    try
    {
	    var evt = document.createEvent( "MutationEvent");
        evt.initMutationEvent(
            "DOMAttrModified",
            bubbles,
            cancelable,
            node,
            prevValue || "",
            newValue || "",
            attrName,
            (((modType = modType.toLowerCase()) == "removal") ? evt.REMOVAL: ((modType == "addition") ? evt.ADDITION : evt.MODIFICATION))
        );
        return evt;
    }
    catch(e)
    {
        return null;
    }
}

/**
* This function gets values from local storage IF we are using the Second Gen EIP Browser.
*
* @param {string}	key					key string to retrieve value
* @param {string}	defaultValue		value to return if stored value unavailable
* @return {string}  stored value or default value
*/
function xrxGetLocalStorageData( key, defaultValue ) 
{
    if(typeof( defaultValue ) == "undefined")
        defaultValue = "";
    var last = defaultValue;
    if(browserType() >= 2)
    {
        try 
        {
            if((last = localStorage.getItem( key )) == null)
                last = defaultValue;
        }
        catch(err) 
        {
            //assume error is that localStorage is not created yet, so use default
            last = defaultValue;
        }
    }
    return last;
}

/**
* This function sets the value into local storage IF we are using the Second Gen EIP Browser.
*
* @param {string}	key		key string to retrieve value
* @param {string}	value	value to store
*/
function xrxSetLocalStorageData( key, value ) 
{
    if(browserType() >= 2)
        localStorage.setItem( key, value );
}



//  Get Xerox Widget Version

/**
* @deprecated since XeroxJavascriptLibrary 4.2.03
*
* This function gets the Xerox Widget version.
*
* @return {string} Rev2 widget version string or "Rev 1"
*/
function getXeroxWidgetVersion()
{
	var version = "Xerox Widgets ";
	try
	{
		version += "Rev 2 " + xrxGetWidgetCodeVersion();
	} catch( e )
	{
		version += "Rev 1";
	}
	return version;
}



//  Make Asynchronous Ajax Call Indirectly

// Global
var xrxAjaxService = null;

/**
* @deprecated since XeroxJavascriptLibrary 4.2.03
*
* This function calls the high level Ajax function in the XeroxJavascriptLibrary.
*
* @param	url					destination address
* @param	envelope			xml string for body of message
* @param	headers				array of optional headers in format {name:value} or null (optional)
* @param	callback_success	function to callback upon successful completion
* @param	callback_failure	function to callback upon failed completion
* @param	timeout				function to call an error routine after a set amount 
*								of seconds (0[default] = no timeout)(optional)
* @param    username            optional username for ajax request
* @param    password            optional password for ajax request
*/
function xrxCallWebserviceIndirect( url, envelope, headers, callback_success, callback_failure, timeout, username, password )
{
    xrxAjaxService = new XRXAjaxParameters( url, envelope, "POST", headers, callback_success, callback_failure, timeout, username, password );
    setTimeout( 'xrxAjaxService.callWebservice()', 0 );       
}

/**
* @deprecated since XeroxJavascriptLibrary 4.2.03
*
* This function calls the low level Ajax function in the XeroxJavascriptLibrary.
*
* @param	url					destination address
* @param	envelope			xml string for body of message
* @param	type				request type (GET or POST)
* @param	headers				array of arrays containing optional headers to 
                                set on the request or null
* @param	callback_success	function to callback upon successful completion
* @param	callback_failure	function to callback upon failed completion
* @param	timeout				function to call an error routine after a set amount 
*								of seconds (0[default] = no timeout)(optional)
* @param    username            optional username for ajax request
* @param    password            optional password for ajax request
*/
function xrxCallAjaxIndirect( url, envelope, type, headers, callback_success, callback_failure, timeout, username, password )
{
    xrxAjaxService = new XRXAjaxParameters( url, envelope, type, headers, callback_success, callback_failure, timeout, username, password );
    setTimeout( 'xrxAjaxService.callAjax()', 0 ); 
}

/**
* @deprecated since XeroxJavascriptLibrary 4.2.03
*
* @private
*/
function XRXAjaxParameters( url, envelope, type, headers, callback_success, callback_failure, timeout, username, password )
{
    this.url = url;
    this.envelope = envelope;
    this.type = type;
    this.headers = headers;
    this.callback_success = callback_success;
    this.callback_failure = callback_failure;
    this.timeout = timeout;
    this.username = username;
    this.password = password;
    this.callWebservice = xrxCallWebserviceContinue;
    this.callAjax = xrxCallAjaxContinue;
}

/**
* @deprecated since XeroxJavascriptLibrary 4.2.03
*
* @private
*/
function xrxCallWebserviceContinue()
{
    xrxCallWebservice( this.url, this.envelope, this.callback_success, this.callback_failure, this.timeout, this.headers, this.username, this.password );
}

/**
* @deprecated since XeroxJavascriptLibrary 4.2.03
*
* @private
*/
function xrxCallAjaxContinue()
{
    xrxCallAjax( this.url, this.envelope, this.type, this.headers, this.callback_success, this.callback_failure, this.timeout, this.username, this.password );
}