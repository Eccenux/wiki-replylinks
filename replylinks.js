// <pre>
/* ======================================================================== *\
	Reply links with relation links
	
	+ adding reply links near user links
	+ inserting text given in newsectionname param (as PHP param in the location string of the page)
	
	Problemy:
	* nie działa dla IE (błędy kodowania niektórych znaków UTF-8)
	Problems:
	* not working well with IE (encoding bugs with UTF-8 special chars)
	
	version:		0.1
	copyright:		(C) 2006 Maciej Jaros (pl:User:Nux, en:User:EcceNux)
	licence:		GNU General Public License v2,
					http://opensource.org/licenses/gpl-license.php
\* ======================================================================== */
addOnloadHook(autoNewSectionName);
addOnloadHook(addReplyLinks);

//
// Settings
//
var hrefUserSpaced = 'http://pl.wikipedia.org/wiki/Wikipedysta:';
// en: 'http://en.wikipedia.org/wiki/User:';
var hrefUserTalkSpaced = 'http://pl.wikipedia.org/wiki/Dyskusja_Wikipedysty:';
// en: 'http://en.wikipedia.org/wiki/User_talk:';
var textReplyShort = 'Odp:';
// en: 'Re:';
var textReplyLinkName = 'odp';
// en: 'reply';

//
// Test
//
// var hrefUserSpaced = location.protocol+'//'+location.host+'/wiki/Wikipedysta:';
// var hrefUserTalkSpaced = 'talk.php';

/* ===================================================== *\
	Function: autoNewSectionName
	
	Inserting new section name from the location string param.
	
	Params
	------
		newsectionname - passed through the location string of the page
\* ===================================================== */
function autoNewSectionName()
{
	//
	// Get section name input element
	//
	var elInput = document.getElementById('wpSummary');
	if (elInput)
	{
		//
		// Get data send from previous page
		//
		var reParam = new RegExp ("&newsectionname=([^&]*)", "i");	// with ignore case
		var matches = reParam.exec(location.search);
		if (matches)
		{
			elInput.value = unescape(matches[1]);
		}
	}
}

/* ===================================================== *\
	Function: addReplyLinks
	
	Adding reply links near user links.
	
	Problemy:
	* nie działa dla IE (błędy kodowania UTF-8)
	* lista linków jest dynamiczna i wszystko się kaszani...
	
	Params
	------
		none
\* ===================================================== */
function addReplyLinks()
{
	//
	// When to run this...
	//
	if (!document.getElementById('t-permalink'))	// almost always
		return;

	var i;

	//
	// Get current page version link
	//
	var hrefPermalink = document.getElementById('t-permalink').getElementsByTagName('a')[0].href;
	
	//
	// Get some places to put this into
	// get every link with href="http://pl.wikipedia.org/wiki/Wikipedysta:..." (no slashes in dots)
	//
	var reHref = new RegExp (hrefUserSpaced + "([^/]*)$", "i");	// with ignore case

	var secAbove = false;
	var a = document.getElementById('bodyContent').getElementsByTagName('A');
//	printDebug ('<ul>');
	for (i = 0; i < a.length; i++) {
		if (secAbove)
		{
//			printDebug ('<li>' + a[i].href + '</li>');
			//
			// checking if this is a user link
			if (a[i].href != '')
			{
				var matches = reHref.exec(a[i].href);
				if (matches)
				{
					//
					// creating reply href
					// var userName = matches[1];
					var hrefReply = hrefUserTalkSpaced + matches[1] + '?action=edit&section=new';
//			var hrefReply = hrefUserTalkSpaced + '?action=edit&section=new';
//			printDebug ('<li>pre: ' + a.length);
					//
					// and now to create and add data for the new reply section name
					var newSectionName = '['+hrefPermalink+'#'+secAbove.id+' '+textReplyShort+secAbove.text+']';
					hrefReply += '&newsectionname=' + escape(newSectionName);
					var newSup = document.createElement('SUP');
					var newA = document.createElement('A');
					newA.setAttribute('href', hrefReply);
					newA.setAttribute('title', textReplyShort+secAbove.text);
					newA.appendChild(document.createTextNode('['+textReplyLinkName+']'))
					newSup.appendChild(newA);
					insertAfterGivenElement(a[i],newSup);
					i++;	// a is a dynamic list
//			printDebug ('; aft: ' + a.length);
//			printDebug ('; a[i+1].href: ' + a[i+1].href);
//			printDebug ('</li>');
				}
			}
		}
		//
		// obtaining anchor and text of the section above user links
		if (a[i].name != '')
		{
			secAbove = new Object;
			secAbove.id = a[i].name;
			// going to header element text
			var header;
			if (a[i].parentNode.nextSibling.nodeType == document.TEXT_NODE)
				// FF
				header = a[i].parentNode.nextSibling.nextSibling
			else
				// IE
				header = a[i].parentNode.nextSibling
			;
			// sometimes there could be a link in the header (maybe some more)
			secAbove.text = stripHtmlTags(header.innerHTML);
			// 
			//alert(a[i].parentNode.nextSibling.innerHTML);
			//alert(secAbove.text);
//			printDebug ('<li>' + secAbove.text + '</li>');
		}
	}
//	printDebug ('</ul>');
//	flushDebug ();
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
	Function: stripHtmlTags
	
	Stripping HTML tags from the HTML text.
	Returns stripped text.
	
	Params
	------
		html - the html text
\* ===================================================== */
function stripHtmlTags(html){
	return html.replace(/<\S[^<>]*>/g, ''); // with global match (all will be replaced)
}

// </pre>