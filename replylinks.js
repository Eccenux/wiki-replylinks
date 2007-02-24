// Instrukcja: [[Wikipedia:Narzędzia/Odpowiedzi z linkami]]
// <pre>
/* ======================================================================== *\
	Reply links with relation links
	
	+ adding reply links near user links
	+ inserting text given in newsectionname param (as PHP param in the location string of the page)
	
	Problemy(?):
	* nie działa dla IE (błędy kodowania niektórych znaków UTF-8)
	Problems(?):
	* not working well with IE (encoding bugs with UTF-8 special chars)
	
	version:		1.0.2
	copyright:		(C) 2006 Maciej Jaros (pl:User:Nux, en:User:EcceNux)
	licence:		GNU General Public License v2,
					http://opensource.org/licenses/gpl-license.php
\* ======================================================================== */
addOnloadHook(autoNewSectionName);
addOnloadHook(addReplyLinks);

//
// Settings
//
var hrefUserAnonim = wgServer + '/wiki/Specjalna:Wk%C5%82ad/';
// en: '/w/index.php\\?title=Specjal:Contributions\\&target=';
var hrefUserSpaced = wgServer + '/wiki/Wikipedysta:';
// en: '/wiki/User:';
var hrefUserSpacedNew =  wgServer + '/w/index.php\\?title=Wikipedysta:';
// en: '/w/index.php\\?title=User:';
var hrefUserTalkSpaced = wgServer + '/wiki/Dyskusja_Wikipedysty:';
// en: '/wiki/User_talk:';
var textReplyShort = 'Odp:';
// en: 'Re:';
var textNoHeadShort = 'Ad:';
// en: 'Ad:';
var textReplyLinkName = 'odp';
// en: 'reply';

/* ===================================================== *\
	Function: autoNewSectionName
	
	Inserting new section name from the location string param.
	Now assumes, that user edits a section rather then adding a new one.
	
	Params
	------
		newsectionname - passed through the location string of the page
\* ===================================================== */
function autoNewSectionName()
{
	//
	// Get input element for section name (now understood as the textbox)
	//
	var elInput = document.getElementById('wpTextbox1');
	if (elInput)
	{
		//
		// Get data send from previous page
		//
		var reParam = new RegExp ("&newsectionname=([^&]*)", "i");	// ignoring lettercase
		var matches = reParam.exec(location.search);
		var sectxt;
		// append to input if all OK
		if (matches)
		{
			sectxt = decodeURIComponent(matches[1]);
			elInput.value += ';'+sectxt+'\n\n';
		}
		
		//
		// Add some summary
		elInput = document.getElementById('wpSummary');
		if (elInput)
		{
			matches = /[ ](.*)\]/.exec(sectxt);
			// append to input if all OK
			if (matches)
				elInput.value += decodeURIComponent(matches[1])
			;
		}
	}
}

/* ===================================================== *\
	Function: addReplyLinks
	
	Adding reply links near user links.
	
	Problemy:
	* nie działa dla IE (błędy kodowania UTF-8)
	
	Params
	------
		none
\* ===================================================== */
function addReplyLinks()
{
	//
	// When to run this...
	//
	// if (!document.getElementById('t-permalink') && !document.getElementById('t-ispermalink') )	// almost always
	if (wgCurRevisionId==0)	// no versioning available
		return
	;

	var i;

	//
	// Get viewed page version link (may be something in history)
	//
	// this one means it is a perma link (comparing versions, showing one specfic version and such)
	if (document.getElementById('t-ispermalink'))
	{
		var hrefPermalink = document.location.href;
	}
	// get latest
	else
	{
		var hrefPermalink = '{{fullurl:' + wgPageName + '|oldid=' + wgCurRevisionId + '}}';
	}
	
	//
	// Get some places to put this into and puting this
	//
	var reHref = new RegExp (hrefUserSpaced + "([^/]*)$", "i");	// with ignore case
	var reHrefNew = new RegExp (hrefUserSpacedNew + "([^/?&]*)", "i");	// with ignore case
	var reHrefAnonim = new RegExp (hrefUserAnonim + "([\.0-9]*)$");
	
	//
	// getting first header name for default tags
	var secAbove = new Object;
	secAbove.id = 'bodyContent';
	secAbove.text = parseSectionText(document.getElementById('content').getElementsByTagName('H1')[0].innerHTML);
	var secReplyText = textNoHeadShort;
	//
	// get every link with href="http://pl.wikipedia.org/wiki/Wikipedysta:..." (no slashes in dots)
	var a = document.getElementById('bodyContent').getElementsByTagName('A');
	for (i = 0; i < a.length; i++) {
//		if (secAbove)
//		{
			//
			// checking if this is a user link
			if (a[i].href != '' && a[i].getAttribute('href').indexOf('#')==-1)
			{
				if (a[i].className=='new')
				{
					var matches = reHrefNew.exec(a[i].href);
				}
				else
				{
					var matches = reHref.exec(a[i].href);
				}
				if (!matches)
				{
					matches = reHrefAnonim.exec(a[i].href);
				}

				if (matches)
				{
					//
					// creating reply href
					// var userName = matches[1];
					var hrefReply = hrefUserTalkSpaced + matches[1] + '?action=edit&section=new';
					//
					// and now to create and add data for the new reply section name
					var newSectionName = '['+hrefPermalink+'#'+secAbove.id+' '+secReplyText+secAbove.text+']';
					hrefReply += '&newsectionname=' + encodeURIComponent(newSectionName);
					var newEl = document.createElement('small');
					var newA = document.createElement('A');
					newA.setAttribute('href', hrefReply);
					newA.setAttribute('title', textReplyShort+secAbove.text);
					newA.appendChild(document.createTextNode('['+textReplyLinkName+']'))
					newEl.appendChild(newA);
					insertAfterGivenElement(a[i],newEl);
					i++;	// a is a dynamic list
				}
			}
//		}
		//
		// obtaining anchor and text of the section above user links
		if (a[i].name != '' && wgCanonicalNamespace!="Image") // skip obtaining headers in image pages
		{
			// going to header element text
			var header;
			if (a[i].parentNode.nextSibling.nodeType == document.TEXT_NODE)
				// FF
				header = a[i].parentNode.nextSibling.nextSibling
			else
				// IE
				header = a[i].parentNode.nextSibling
			;
			// check if this is the right element - if not skip
			if (header) if (header.nodeType == document.ELEMENT_NODE)
			{
				secAbove.id = a[i].name;
				// sometimes there could be a link in the header (maybe some more)
				secAbove.text = parseSectionText(header.innerHTML);
				// should be set only once (as it is always the same), but let's leave it that way
				secReplyText = textReplyShort;
			}
		}
	}
}

/* ===================================================== *\
	Function: insertAfterGivenElement
	
	Inserting "newEl" element after given "el" element.
	
	Params
	------
		el - element object to insert after
		newEl - (new) element object to insert
\* ===================================================== */
function insertAfterGivenElement(el, newEl) {
	if (el.nextSibling)
	{
		el.parentNode.insertBefore(newEl, el.nextSibling);
	}
	else
	{
		el.parentNode.appendChild(newEl);
	}
}

/* ===================================================== *\
	Function: [obsolete] stripHtmlTags
	
	Stripping HTML tags from the HTML text.
	Returns stripped text.
	
	Params
	------
		html - the html text
\* ===================================================== */
function stripHtmlTags(html){
	return html.replace(/<\S[^<>]*>/g, ''); // with global match (all will be replaced)
}

/* ===================================================== *\
	Function: parseSectionText
	
	Stripping HTML tags from the HTML text and cleansing 
	of some wikicode
	Returns stripped text.
	
	Params
	------
		html - the html text
\* ===================================================== */
function parseSectionText(html){
	// with global match (all will be replaced)
	html = html.replace(/<\S[^<>]*>/g, '');
	// replace cut anything in brackets [] (editing sections links and such)
	html = html.replace(/\[[^\]]*\]/,'');
	// replace wiki stuff with null
	html = html.replace(/[\{\}]/g,'');
	// trim (right,left)
	html = html.replace(/[ \t]*$/,'').replace(/^[ \t]*/,'');
	return html
}

// </pre>