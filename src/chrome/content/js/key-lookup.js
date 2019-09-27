/*
Keys4All Thunderbird-Addon
Designed and developed by
Fraunhofer Institute for Secure Information Technology SIT
<https://www.sit.fraunhofer.de>
(C) Copyright FhG SIT, 2018

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

Components.utils.import("resource://gre/modules/Services.jsm");

//TODO: delete
const nsIX509CertDB = Components.interfaces.nsIX509CertDB;
const nsX509CertDBContractID = "@mozilla.org/security/x509certdb;1";
const nsIX509Cert = Components.interfaces.nsIX509Cert;

/*
 * regular expression for valid email addresses (official RFC 5322 regex).
 */
const EMAIL_PATTERN = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var tlds = ['AC', 'AD', 'AE', 'AERO', 'AF', 'AG', 'AI', 'AL', 'AM', 'AN', 'AO', 'AQ', 'AR', 'ARPA', 'AS', 'ASIA', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BIZ', 'BJ', 'BM', 'BN', 'BO', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CAT', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'COM', 'COOP', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EDU', 'EE', 'EG', 'ER', 'ES', 'ET', 'EU', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GOV', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'INFO', 'INT', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JOBS', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MG', 'MH', 'MIL', 'MK', 'ML', 'MM', 'MN', 'MO', 'MOBI', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MUSEUM', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NAME', 'NC', 'NE', 'NET', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'ORG', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'POST', 'PR', 'PRO', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'ST', 'SU', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TEL', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TP', 'TR', 'TRAVEL', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UK', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XN', 'XXX', 'YE', 'YT', 'ZA', 'ZM', 'ZW'];

var pgpEncryption = false;
var smimeEncryption = false;
var enigBtn = false;

var recipients = [];
var recipientsFromAddressFields = [];
var sender = "";


function sendToIframe(data) {
	//console.log(JSON.stringify(data));
	var iframeEvent = new CustomEvent('kbevent', {detail: data});
	//document.dispatchEvent(iframeEvent);
	document.getElementById("keybirdy-sidebar-content").contentDocument.dispatchEvent(iframeEvent);
	console.log("sent event");
}


/*
 * extracts all valid email addresses from the input string
 * and puts them in the global array 'recipientsFromAddressFields'.
 */

function extractEMailAddresses(input) {
	if (input.length > 0) {
		var addresses = input.split(",");
		var recipientsFromAddressFields = [];

		for (let k=0; k<addresses.length; k++) {
			var res = addresses[k].trim();
			var ltIndex = res.indexOf("<");
			if (ltIndex >= 0) {
				res = res.substring(ltIndex+1, res.length);
			}
			var gtIndex = res.indexOf(">");
			if (gtIndex >= 0) {
				res = res.substring(0, gtIndex);
			}

			let match = EMAIL_PATTERN.exec(res);
			if (match) {
				//Application.console.log("[extractEMailAddresses] match");
				var tld = res.substring(res.lastIndexOf('.') + 1);
				//Application.console.log("TLD: " + tld);
				if(tlds.indexOf(tld.toUpperCase()) > -1) {
					recipientsFromAddressFields[recipientsFromAddressFields.length] = res;
				}
			}
			//recipientsFromAddressFields[recipientsFromAddressFields.length] = res;
		}
		return recipientsFromAddressFields;
	}
	return [];
}

function getRecipientsAddresses() {

	recipientsFromAddressFields = [];
	var recipientsList = [];

	var win = Services.wm.getMostRecentWindow("msgcompose");
	composeFields = {};
	win.Recipients2CompFields(composeFields);
	console.log("ComposeFields: " + composeFields.to);
	recipientsList = extractEMailAddresses(composeFields.to);
	//recipientsList.append(extractEMailAddresses(composeFields.cc));
	//recipientsList.append(extractEMailAddresses(composeFields.bcc));
	console.log("RecipientsList: " + JSON.stringify(recipientsList));
	return recipientsList;
}

function getSenderAddress() {

	return document.getElementById("msgIdentity").description;
	//TODO: delete everything under this line
	var win = Services.wm.getMostRecentWindow("msgcompose");
	composeFields = {};
	win.Recipients2CompFields(composeFields);
	console.log("getSenderAddress: " + composeFields.from);
	//recipientsList = extractEMailAddresses(composeFields.to);
	//recipientsList.append(extractEMailAddresses(composeFields.cc));
	//recipientsList.append(extractEMailAddresses(composeFields.bcc));
	//console.log("RecipientsList: " + JSON.stringify(recipientsList));
	return composeFields.from;
}


function isPGPEncryptionEnabled() {
	//var enigmailEncryptBtn = document.getElementById("button-enigmail-encrypt");
	var enigmailEncryptBtn = document.getElementById("button-enigmail-encrypt");
	var enigmailEncryptPgpMime = document.getElementById("enigmail_compose_pgpmime_item");
	var enigmailEncryptPgpInline = document.getElementById("enigmail_compose_inline_item");
	if (enigmailEncryptBtn) {

		let attr = enigmailEncryptBtn.getAttribute("checked");
		//TODO:delete
		Application.console.log("EnigButton: " + attr);
		if (attr == "true"/* && (enigmailEncryptPgpMime.getAttribute("checked") == "true" || enigmailEncryptPgpInline.getAttribute("checked") == "true")*/) {
			Application.console.log("[isPGPEncryptionEnabled] Enigmail encryption: ON");
			pgpEncryption = true;
			return true;
			//showVVVPanel();
		} else {
			Application.console.log("[isPGPEncryptionEnabled] Enigmail encryption: OFF");
			pgpEncryption = false;
			return false;
			//showVVVPanel();
		}
	}
}


function KBsendData(recipientsList, sender) {
	var data = {};

	//data.gMsgCompose = gMsgCompose;
	//data.composerDocument = document;

	data.recipients = [];
	for(var i=0; i<recipientsList.length; i++) {
		data.recipients[i] = {};
		data.recipients[i].address = recipientsList[i];
	}
	data.sender = sender;
	sendToIframe(data);

}



function KBaddressOnChange() {
	var senderEmail = getSenderAddress();
	var recipientsData = getRecipientsAddresses();

	if(recipientsData.length != 0 && recipientsData)
	{
		console.log("SEND DATA: " + JSON.stringify(recipientsData));
		KBsendData(recipientsData, senderEmail);
	}

}

var intervalTimer;

window.addEventListener("load",

	function _vvv_composeStartup(event) {
		//TODO: delete
		/*
		sendToIframe(["123", "456"]);
		var win = Services.wm.getMostRecentWindow("msgcompose");
		composeFields = {};
		win.Recipients2CompFields(composeFields);
		console.log(composeFields.to);
		recipientsList = extractEMailAddresses(composeFields.to);
		*/
		//KBaddressOnChange();
		/*
		if (isPGPEncryptionEnabled() || isSMIMEEncryptionEnabled()) {
			Application.console.log("\n\ncheck sender address\n\n");
			//TODO: delete next line?
			checkSenderAddress();
			checkRecipientsAddresses();
		}
*/
		var adrCol = document.getElementById("addressCol2#1"); // recipients field
		if (adrCol) {
			let attr = adrCol.getAttribute("oninput");
			adrCol.setAttribute("oninput", attr + "; KBaddressOnChange();");
			adrCol.setAttribute("onblur", attr + "; KBaddressOnChange();");
		}
		var adrCol2 = document.getElementById("addressCol2#2"); // recipients field
		if (adrCol2) {
			let attr2 = adrCol2.getAttribute("oninput");
			adrCol2.setAttribute("oninput", attr2 + "; KBaddressOnChange();");
			adrCol2.setAttribute("onblur", attr2 + "; KBaddressOnChange();");
		}
		var adrCol3 = document.getElementById("addressCol2#3"); // recipients field
		if (adrCol3) {
			let attr3 = adrCol3.getAttribute("oninput");
			adrCol3.setAttribute("oninput", attr3 + "; KBaddressOnChange();");
			adrCol3.setAttribute("onblur", attr3 + "; KBaddressOnChange();");
		}
		var senderCol = document.getElementById("msgIdentity");
		if (senderCol) {
			//TODO: fix
			/*
			let attr = senderCol.getAttribute("onselect");
			senderCol.setAttribute("onselect", attr + "; KBsenderOnChange();");
			*/
		}


		/*
		document.addEventListener("vvv-mail", childEventHandler, false);
	  setTimeout(function(){
			document.getElementById("addressCol2#1").focus();
			document.getElementById("addressCol2#1").blur();
			document.getElementById("addressCol2#1").focus();
		},	1000);
*/
/*
		setInterval(function(){
			var enigmailEncryptBtn = document.getElementById("button-enigmail-encrypt");
			if (enigmailEncryptBtn) {
				let attr = enigmailEncryptBtn.getAttribute("checked");

				if (attr == "true" && enigBtn === false) {
					enigBtn = true;
					Application.console.log("[isPGPEncryptionEnabled] Enigmail encryption: ON");
					pgpEncryption = true;
					addressOnChangeVVV();
					//showVVVPanel();
				} else if (attr == "" && enigBtn === true){
					enigBtn = false;
					Application.console.log("[isPGPEncryptionEnabled] Enigmail encryption: OFF");
					pgpEncryption = false;
					addressOnChangeVVV();
					//return false;
					//showVVVPanel();
				}
			}
		}, 1000);
*/
	},
	false);
/*
var childEventHandler = function (e) {
	addressOnChangeVVV();
};
*/
/*
 * Accessing the main window from compose window:
 *
 *	var wMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
 *	var mainWindow = wMediator.getMostRecentWindow("mail:3pane");
 *	Application.console.log("[addressOnChangeVVV] mainWindow: "+mainWindow);
 *	Application.console.log("[addressOnChangeVVV] mainWindow.hallo: "+mainWindow.hallo);
 */



/*addEventListener("compose-send-message", function (event) {
	openKeylookupDialog(event);
}, true);*/

// window.setInterval(function(e) { check_addrs(); }, 5000);

/*function openKeylookupDialog(event) {

	let enigmailEncryptButton = $("#button-enigmail-encrypt");
	if (enigmailEncryptButton != null) {
		let attr = enigmailEncryptButton.attr('checked');
		if (typeof attr !== typeof undefined && attr !== false) {
			Application.console.log("enigmail encrpyt button is checked!");
		}
	}

	let smimeEncryptButton = document.getElementById("menu_securityEncryptRequire2");
	Application.console.log("smimeEncryptButton: "+smimeEncryptButton);

	if (smimeEncryptButton.hasAttribute('checked')) {
		Application.console.log("smime encrpyt button has 'checked' attribute! ");
		// TODO: open dialog...
	} else {
		Application.console.log("smime encrpyt button has no 'checked' attribute!");
	}


	window.openDialog("chrome://vvv-addon/content/ui/key-lookup-dialog.html", "Key lookup", "centerscreen,all,modal", document);

	event.preventDefault();
    return false;
}*/
