/**
	@file Odpowiedzi z linkami (Reply links with backtrack links)

	Opis (pl):
		- http://pl.wikipedia.org/wiki/Wikipedia:Narz%C4%99dzia/Odpowiedzi_z_linkami

    Main functions:
		- adding reply links near user links
		- inserting text given in newsectionname (as PHP param in the location string of the page)

    Copyright:  ©2006-2020 Maciej Jaros (pl:User:Nux, en:User:EcceNux)
     Licencja:  GNU General Public License v2
                http://opensource.org/licenses/gpl-license.php

	@note Please keep MW 1.16 compatible (i.e. do not use mw.config directly)
	@note jQuery is required though
	
	@note Dev version: http://pl.wikipedia.org/wiki/Wikipedysta:Nux/replylinks.dev.js
	@note Prod version: https://pl.wikipedia.org/wiki/MediaWiki:Gadget-replylinks.js
*/
/* global mw, $ */
/* -=-=-=-=-=-=-=-=-=-=-=-
	Object init
 -=-=-=-=-=-=-=-=-=-=-=- */
if (typeof(window.oRepLinks) != 'undefined')
{
	throw ("oRepLinks already used");
}
var oRepLinks = {};

/* -=-=-=-=-=-=-=-=-=-=-=-
	Version
 -=-=-=-=-=-=-=-=-=-=-=- */
oRepLinks.version = oRepLinks.ver = '1.6.12pre';

/* -=-=-=-=-=-=-=-=-=-=-=-
	Preferences
 -=-=-=-=-=-=-=-=-=-=-=- */
// i18n
oRepLinks.i18n = {'':''
	,'en' : {'':''
		,'std prefix'        : 'Re:'   // standard prefix to a replay
		,'no section prefix' : 'Ad:'   // prefix shown when a section header was not found
		,'reply link text'   : 'reply'
	}
	,'pl' : {'':''
		,'std prefix'        : 'Odp:'
		,'no section prefix' : 'Ad:'
		,'reply link text'   : 'odp'
	}
};
// IP will be added to the end to create a working link
oRepLinks.hrefOnlineIPwhois = 'http://www.ripe.net/perl/whois?form_type=simple&searchtext=';

/* -=-=-=-=-=-=-=-=-=-=-=-
	Gadget code
	$G = oRepLinks
 -=-=-=-=-=-=-=-=-=-=-=- */
(function($G){
/**
	@brief get MediaWiki configuration variable
	
	MW 1.16 and 1.17+ compatible
*/
$G.getMediaWikiConfig = function(variableName)
{
	if (typeof(mw) === 'object' && 'config' in mw) {
		return mw.config.get(variableName)
	}
	return window[variableName];
}

//
// i18n setup
//
$G.Lang = "en";
if ($G.getMediaWikiConfig('wgUserLanguage') in $G.i18n)
{
	$G.Lang = $G.getMediaWikiConfig('wgUserLanguage');
}
$G.i18n = $G.i18n[$G.Lang];

/**
	@brief get all alternative namespaces for given \a namespaceNumber.

	@return array of namespace names (including alternative names)
*/
$G.getNamespaceNames = function(namespaceNumber, encodingFunction)
{
	var found = [];
	var namespacesIds = $G.getMediaWikiConfig('wgNamespaceIds');
	for (var id in namespacesIds)
	{
		if (namespacesIds[id] == namespaceNumber)
		{
			if (encodingFunction)
			{
				id = encodingFunction(id);
			}
			found.push(id);
		}
	}
	return found;
}

//
// Technical Settings
//
//! @warning avoid using catching parenthesis by adding "?:"
// 'http://.../wiki/User:';
$G.strReHrefBase          = $G.getMediaWikiConfig('wgServer') + $G.getMediaWikiConfig('wgArticlePath').replace('$1',  '(?:' + $G.getNamespaceNames(2, encodeURIComponent).join('|') + ')') + ':';
// 'http://.../w/index.php\\?title=User:';
$G.strReHrefNewBase       = $G.getMediaWikiConfig('wgServer') + $G.getMediaWikiConfig('wgScript') + '\\?title=' + '(?:' + $G.getNamespaceNames(2, encodeURIComponent).join('|') + ')' + ':';
// 'http://.../wiki/Specjal:Contributions';
$G.strReHrefAnonimBase    = $G.getMediaWikiConfig('wgServer') + $G.getMediaWikiConfig('wgArticlePath').replace('$1', encodeURIComponent($G.getMediaWikiConfig('wgFormattedNamespaces')[-1])) + ':(?:Contributions|Wk%C5%82ad)/';
// 'http://.../wiki/User_talk:';
$G.strBaseUserTalkURL     = $G.getMediaWikiConfig('wgServer') + $G.getMediaWikiConfig('wgArticlePath').replace('$1', encodeURIComponent($G.getMediaWikiConfig('wgFormattedNamespaces')[3])) + ':';

/*
http://pl.wikipedia.org/w/index.php?title=Wikipedia:Boty&action=edit&section=2
...tableinfo\|([^|]+)\|[^\[\]]+\[\[(?:User|Wikipedysta):([^\[\]\|]+).*
,'$1':'$2'
*/
$G.oBotToOwner = window.oRepLinksCustomB2O || {'':''
,'Ab.awbot':'Abronikowski'
,'AkBot':'Ankry'
,'AlohaBOT':'Patrol110'
,'AutoPur':'Pur'
,'Beau.bot':'Beau'
,'Beau.bot.admin':'Beau'
,'Bluebot':'Blueshade'
,'BossBot':'The boss'
,'BotOks':'Skalee'
,'Bugbot':'Lcamtuf'
,'Bulwersator: bot':'Bulwersator'
,'Cookie.bot':'Jwitos'
,'DodekBot':'Dodek'
,'g.bot':'gregul'
,'Holek.Bot':'Holek'
,'KamikazeBot':'Karol007'
,'Kbot':'Kb'
,'Lambot':'Lampak'
,'LeafBot':'Leafnode'
,'MagulBot':'Magul'
,'MalarzBOT':'malarz_pl'
,'MastiBot':'Masti'
,'MatmaBot':'Matma_Rex'
,'MBot':'maikking'
,'McBot':'McMonster'
,'Merdis.bot':'Merdis'
,'MiszaBot':'Misza13'
,'Miner':'Saper'
,'NickyBot':'Wpedzich'
,'PowerBot':'Powerek38'
,'Putorobot':'Putoro'
,'RooBot':'Roo72'
,'RewersBot':'Awersowy'
,'Staszek_Jest_Jeszcze_Szybszy':'Staszek_Szybki_Jest'
,'Szczepan.bot':'Szczepan1990'
,'TAMMBot':'TAMM'
,'ToBot':'ToSter'
,'Trivelt.bot':'Trivelt'
,'tsca.bot':'Tsca'
,'Ver-bot':'Verwolff'
,'VindiBot':'Vindicator'
,'WarXboT':'WarX'
,'WiktorynBot':'Wiktoryn'
,'YarluBot':'Yarl'
};

/**
	@brief Inserting new section name and some info from the location string param.

	@note newsectionname url param used
*/
$G.autoNewSectionName = function()
{
	//
	// Get input element for section name (now understood as the textbox)
	//
	var elInput = document.getElementById('wpTextbox1');
	if (location.href.indexOf('Nux/test') > 0) {
		console.log('[replylinks] autoNewSectionName'
			, document.querySelector('.ext-discussiontools-ui-newTopic')
		);
		
		document.querySelector('.oo-ui-fieldLayout-field input').value = 'Temat jakiś';
		
		var doneInsertStuffVe = false;
		function insertStuffVe() {
			if (doneInsertStuffVe) {
				return false;
			}
			doneInsertStuffVe = true;
			
			var rangeToReplace = new ve.Range(0),
			    surfaceModel = ve.init.target.getSurface().getModel(),
			    fragment = surfaceModel.getLinearFragment(rangeToReplace);
			fragment.insertContent("testung testung");	
		}
		
		// wait until surface is ready
		if ( window.ve && ve.init && ve.init.target && ve.init.target.active ) {
			console.log('[replylinks] ve was ready');
			//insertStuffVe();
		}
		mw.hook( 've.activationComplete' ).add( function () {
			console.log('[replylinks] ve activationComplete');
			insertStuffVe();
		} );
		mw.loader.using( 'ext.visualEditor.desktopArticleTarget.init' ).then( function() {
			console.log('[replylinks] ve desktopArticleTarget init');
			insertStuffVe();
		});

	}
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
			{
				elInput.value += decodeURIComponent(matches[1]);
			}
		}
	}
};

/**
	@brief Adding reply links near user links.
*/
$G.addReplyLinks = function()
{
	//
	// When to run this...
	//
	// if (!document.getElementById('t-permalink') && !document.getElementById('t-ispermalink') )	// almost always
	if ($G.getMediaWikiConfig('wgCurRevisionId')==0)	// no versioning available
	{
		return;
	}

	//
	// Get viewed page version link (may be something in history)
	//
	var hrefPermalink;
	// this one means it is a perma link (comparing versions, showing one specfic version and such)
	if (document.location.href.indexOf('&oldid=')!=-1)
	{
		hrefPermalink = document.location.href.replace(/#.+$/,'');
	}
	// get latest
	else
	{
		hrefPermalink = '{{fullurl:' + $G.getMediaWikiConfig('wgPageName') + '|oldid=' + $G.getMediaWikiConfig('wgCurRevisionId') + '}}';
	}

	//
	// Find user pages links and put links into them
	//

	//
	// create regexpes for user links
	var reHref = new RegExp ($G.strReHrefBase + "([^/]*)$", "i");	// with ignore case
	var reHrefNew = new RegExp ($G.strReHrefNewBase + "([^/?&]*)", "i");	// with ignore case
	var reHrefAnonim = new RegExp ($G.strReHrefAnonimBase + "([\\.0-9]*|[0-9a-f]*:[0-9a-f:]+)$", 'i');

	var content = document.getElementById('content');
	if (!content)
	{
		content = document.getElementById('mw_content');	// moder skin
		if (!content)
		{
			return;
		}
	}
	var bodyContent_id = 'bodyContent';
	var bodyContent = document.getElementById(bodyContent_id);
	if (!bodyContent)
	{
		bodyContent = document.getElementById('mw_contentholder');	// moder skin
	}

	//
	// first header as a default section
	var secAbove = {
		'id' : bodyContent_id,	// for link hash
		'text' : $G.parseSectionText($G.getMediaWikiConfig('wgPageName')).replace(/_/g, ' ')	// for display
	};
	var secReplyText = $G.i18n['no section prefix'];
	//
	// in search for links... and sections
	var a = $G.getElementsByTagNames ('A,SPAN', bodyContent);
	for (var i = 0; i < a.length; i++)
	{
		//
		// checking if this is a user link
		if (a[i].nodeName.toLowerCase()=='a' && a[i].href != '' && a[i].getAttribute('href').indexOf('#')==-1)
		{
			var anonimous = false;
			var matches = (a[i].className.indexOf('new')>=0) ? reHrefNew.exec(a[i].href) : reHref.exec(a[i].href);
			if (!matches)
			{
				matches = reHrefAnonim.exec(a[i].href);
				anonimous = true;
			}
			// botname translation due to match with nonanonimous link
			else if ($G.oBotToOwner[matches[1]] != undefined)
			{
				matches[1] = $G.oBotToOwner[matches[1]];
			}

			if (matches)
			{
				//
				// creating reply href
				// var userName = matches[1];
				var hrefReply = $G.strBaseUserTalkURL + matches[1] + '?action=edit&section=new';
				//
				// and now to create and add data for the new reply section name
				var newSectionName = '['+hrefPermalink+'#'+secAbove.id+' '+secReplyText+secAbove.text+']';
				hrefReply += '&newsectionname=' + encodeURIComponent(newSectionName);
				var newEl = document.createElement('small');
				var newA = document.createElement('a');
				newA.className='gadget-replylinks-reply';
				newA.setAttribute('href', hrefReply);
				newA.setAttribute('title', $G.i18n['std prefix']+secAbove.text);
				newA.appendChild(document.createTextNode('['+$G.i18n['reply link text']+']'));
				newEl.appendChild(newA);
				$G.insertAfterGivenElement(a[i],newEl);

				// Anonimous whois checker
				if (anonimous)
				{
					newA = document.createElement('a');
					newA.setAttribute('href', $G.hrefOnlineIPwhois+matches[1]);
					newA.setAttribute('title', 'IP whois');
					newA.appendChild(document.createTextNode('[?]'));
					newEl.appendChild(newA); // appending to previously created
					//i++;	// a is a dynamic list
				}
			}
		}

		//
		// a little hunt for sections (anchor and text of the section above user links
		if (a[i].nodeName.toLowerCase()=='a' && $G.getMediaWikiConfig('wgNamespaceNumber') != 6 && a[i].id != '' && a[i].parentNode.nodeName=='P') // skip obtaining headers on image pages and non-header links
		{
			var header = a[i].parentNode;
			// moving forward in search for the header
			var found;
			for (found=3; found; found--)	// max 3 forward
			{
				header = header.nextSibling;
				if (header!=null && header.nodeType==document.ELEMENT_NODE && header.nodeName.search(/h[0-9]/i)==0)
				{
					break;
				}
			}
			if (found)
			{
				secAbove.id = a[i].id;
				// sometimes there could be a link in the header (maybe some more)
				secAbove.text = $G.stripSectionNumbering($G.parseSectionText(header.innerHTML), secAbove.id);
				// should be set only once (as it is always the same), but let's leave it that way
				secReplyText = $G.i18n['std prefix'];
				//header.innerHTML = '['+secAbove.id+'@'+found+']&rarr;'+secAbove.text;
			}
		}
		//
		// vector style sections
		if (a[i].className=='mw-headline')
		{
			secAbove.id = a[i].id;
			// sometimes there could be a link in the header (maybe some more)
			secAbove.text = $G.stripSectionNumbering($G.parseSectionText(a[i].innerHTML), secAbove.id);
			// should be set only once (as it is always the same), but let's leave it that way
			secReplyText = $G.i18n['std prefix'];
			//header.innerHTML = '['+secAbove.id+'@'+found+']&rarr;'+secAbove.text;
		}
	}
};

/**
	@brief Inserting \a newEl element after given \a el element.

	@param el
		Element object to insert after
	@param newEl
		(new) element object to insert
\* ===================================================== */
$G.insertAfterGivenElement = function (el, newEl)
{
	if (el.nextSibling)
	{
		el.parentNode.insertBefore(newEl, el.nextSibling);
	}
	else
	{
		el.parentNode.appendChild(newEl);
	}
};

/**
	@brief Parses Section HTML to Text

	Stripping HTML tags from the HTML text and cleansing of some wikicode

	@param html
		The html string
	@returns Stripped text
*/
$G.parseSectionText = function (html)
{
	// with global match (all will be replaced)
	html = html.replace(/<\S[^<>]*>/g, '');
	// replace cut anything in brackets [] (editing sections links and such)
	html = html.replace(/\[[^\]]*\]/,'');
	// replace wiki stuff with null
	html = html.replace(/[{}]/g,'');
	// trim (right,left)
	html =  html.replace(/[ \t]*$/,'').replace(/^[ \t]*/,'');
	return html;
};

/**
	@brief Strips section numbering if present.

	@param sectionText Text of the section.
	@param sectionId Id of the section.
	@returns Stripped text
*/
$G.stripSectionNumbering= function (sectionText, sectionId)
{
	// strip section numering
	if (sectionText.search(/^[0-9.]+ /) > -1)
	{
		var isNumbered = true;
		if (sectionId.search(/^[0-9.]+_/) > -1)
		{
			if (sectionText.replace(/^([0-9. ]+) .*/, '$1').length == sectionId.replace(/^([0-9._]+)_.*/, '$1').length)
			{
				isNumbered = false;
			}
		}
		if (isNumbered)
		{
			sectionText = sectionText.replace(/^[0-9.]+ (.*)/, '$1');
		}
	}
	return sectionText;
};

/**
	@brief Pobiera elementy o nazwach podanych na liście

	Elementy zwracane są w kolejności występowania w dokumencie.

	@param list
		CSV list of tag names
	@param obj [optional]
		Element wzg. którego pobierać elementy z listy
		jak w obj.getElementsByTagName('el.name')
*/
$G.getElementsByTagNames = function (list, obj)
{
	// for some reason sourceIndex doesn't work in Opera when NOT in debug mode (returns -1)...
	// so we use jQuery...
	var resultArray = new Array();
	$(list, obj).each(function(){
		resultArray.push(this);
	})
	return resultArray;
};

//
// Init
//
// add text to textbox
//if ($G.getMediaWikiConfig('wgAction')=='edit' && $G.getMediaWikiConfig('wgCanonicalNamespace')=='User_talk')
// note, wgAction=view for dynamic new-section
if (location.search.indexOf('newsectionname=') > 0 
	&& $G.getMediaWikiConfig('wgCanonicalNamespace')=='User_talk')
{
	$($G.autoNewSectionName);
}
// add links
if ($G.getMediaWikiConfig('wgAction')!='edit' 
	&& $G.getMediaWikiConfig('wgAction')!='submit')
{
	$($G.addReplyLinks);
}

/* -=-=-=-=-=-=-=-=-=-=-=-
	Gadget code : END
 -=-=-=-=-=-=-=-=-=-=-=- */
})(oRepLinks);