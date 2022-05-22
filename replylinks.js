/* global ve */
/* eslint-disable indent */
/**
	@file Odpowiedzi z linkami (Reply links with backtrack links)

	Opis (pl):
		- http://pl.wikipedia.org/wiki/Wikipedia:Narz%C4%99dzia/Odpowiedzi_z_linkami

    Main functions:
		- adding reply links near user links
		- inserting text given in newsectionname (as PHP param in the location string of the page)

    Copyright:  ©2006-2022 Maciej Jaros (pl:User:Nux, en:User:EcceNux)
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
window.oRepLinks = oRepLinks;

/* -=-=-=-=-=-=-=-=-=-=-=-
	Version
 -=-=-=-=-=-=-=-=-=-=-=- */
oRepLinks.version = oRepLinks.ver = '1.7.3';

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

/**
 * Pobieranie listy botów.
 * 
 * Do użycia na:
 * https://pl.wikipedia.org/wiki/Wikipedia:Boty
 * 
 * Do podmiany obiekt `oBotToOwner`.
 */
/**
function getUserFromAnchor(a) {
	let name = '';
	a.href.replace(/\/wiki\/Wikipedysta:(.+)/, function (a, userName) {
		name = userName;
	});
	return name;
}

function readBots() {
	const trs = document.querySelectorAll('table.wikitable tr');
	const bots = {};
	for (const tr of trs) {
		const tds = tr.querySelectorAll('td:is(:nth-child(1), :nth-child(2))')
		if (tds.length != 2) {
			continue;
		}
		const bot = tds[0].querySelector('a[href*="/wiki/Wikipedysta:"]')
		const user = tds[1].querySelector('a[href*="/wiki/Wikipedysta:"]')
		if (!bot || !user) {
			continue;
		}
		let botName = getUserFromAnchor(bot);
		let userName = getUserFromAnchor(user);
		if (!botName.length || !userName.length) {
			console.warn('skipping', {
				botName,
				userName
			});
			continue;
		}
		botName = botName.substring(0, 1).toUpperCase() + botName.substring(1);
		bots[botName] = userName;
		console.log(botName, userName);
	}
	return bots;
}
var bots = readBots();
console.log(bots);

function botStrings(bots) {
	const sortedKeys = Object.keys(bots).sort();
	let botString = '';
	for (botName of sortedKeys) {
		botString += `\n,'${botName}':'${bots[botName]}'`;
	}
	return botString;
}
console.log(botStrings(bots));
copy(botStrings(bots));
/**/

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
		return mw.config.get(variableName);
	}
	return window[variableName];
};

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
};

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
	The bot:owner map.
	oBotToOwner update is above.
*/
$G.oBotToOwner = window.oRepLinksCustomB2O || {'':''
,'.anacondabot':'.anaconda'
,'A.bot':'A.'
,'Ab.awbot':'Abronikowski'
,'Adas_bot':'Adziura'
,'AkBot':'Ankry'
,'AlohaBOT':'Patrol110'
,'AndrzeiBOT':'Andrzei111'
,'Andrzej94.bot':'Andrzej94'
,'AutoBot':'WarX'
,'AutoPur':'Pur'
,'BOTiczelli':'ABX'
,'Beau.bot':'Beau'
,'Beau.bot.admin':'Beau'
,'BlackBot':'Blackfish'
,'Bluebot~plwiki':'Blueshade'
,'Bocianski.bot':'Bocianski'
,'BossBot':'The_boss'
,'BotOks':'Skalee'
,'BuddBot':'Budd_Le_Toux'
,'Bugbot':'Lcamtuf'
,'BzBot':'Be%C5%BBet'
,'ClueBot~plwiki':'Mathel'
,'Cookie.bot':'Jwitos'
,'DodekBot':'Dodek'
,'DonnerJack.bot':'ABach'
,'Du%C5%A1an_Krehe%C4%BE_(bot)':'Du%C5%A1an_Krehe%C4%BE'
,'EgonBOT':'Egon~plwiki'
,'EinsBot':'Einsbor'
,'EmptyBot':'Emptywords'
,'EquadusBot~plwiki':'Equadus'
,'Erwin-Bot':'Ejdzej'
,'Escarbot':'Vargenau'
,'Faxebot':'Faxe'
,'G.bot':'Gregul'
,'Geonidiuszbot':'Geonidiusz'
,'Halibott':'Halibutt'
,'Holek.Bot':'Holek'
,'JarektBot':'Jarekt'
,'Jaszczurobot':'Jaszczurocz%C5%82ek'
,'Jozef-k.bot':'Jozef-k'
,'K.J.Bot':'Krzysiu_Jarzyna'
,'KamikazeBot':'Karol007'
,'Kamil-bBOT':'Kamil-b'
,'KangelBot':'Kangel'
,'Kbot':'Kb'
,'Kotbot':'Kotniski'
,'LA2-bot':'LA2'
,'Lambot':'Lampak'
,'LeafBot':'Leafnode'
,'LeonardoRob0t':'LeonardoGregianin'
,'MBot':'Maikking'
,'MagulBot':'Magul'
,'MalarzBOT':'Malarz_pl'
,'MalarzBOT.admin':'Malarz_pl'
,'MarciBOT':'Marcimon'
,'Margosbot':'Margos'
,'MastiBot':'Masti'
,'MastiBot.admin':'Masti'
,'Matbot':'Matusz'
,'Mateusz.bot':'Mateusz.ns'
,'Mathieu_Mars_.bot':'Mathieu_Mars'
,'MatmaBot':'Matma_Rex'
,'McBot~plwiki':'McMonster'
,'Merdis.bot':'Merdis'
,'Miner':'Saper'
,'MiszaBot':'Misza13'
,'Mr%C3%B3wka':'Matma_Rex'
,'NickyBot':'Wojciech_P%C4%99dzich'
,'NuxBot':'Nux'
,'OdderBot':'Odder'
,'Ohtnim':'Mintho'
,'Olafbot':'Olaf'
,'OpenBOT':'Openbk'
,'PBbot':'Peter_Bowman'
,'PL_Przemek.bot':'PL_Przemek'
,'Pacynka_malarza':'Malarz_pl'
,'Pawe%C5%82_Ziemian_BOT':'Pawe%C5%82_Ziemian'
,'PowerBot':'Powerek38'
,'Powiadomienia_ZB':'Matma_Rex'
,'PrzemuBot':'Przemub'
,'Pszcz%C3%B3%C5%82ka':'Therud'
,'PtjackBOT':'Ptjackyll'
,'Putorobot':'Putoro'
,'PwlBOT':'Polskawliczbach'
,'RavpawliszBot':'Ravpawlisz'
,'Rebot~plwiki':'Jagger'
,'RewersBot':'Nostrix'
,'RooBot':'Roo72'
,'RzuwigBot':'Rzuwig'
,'StankoBot':'Stanko'
,'Staszek_Jest_Jeszcze_Szybszy':'Staszek_Szybki_Jest'
,'Stv.bot':'Stv'
,'Sunridin.bot':'Sunridin'
,'Szczepan.bot':'Szczepan1990'
,'Szoltys-bot':'Szoltys'
,'TAMMBot':'TAMM'
,'TarBot':'Tar_L%C3%B3cesilion'
,'Tawbot':'Taw'
,'The_Polish_Bot':'The_Polish'
,'ToBot':'ToSter'
,'Trivelt.bot':'Trivelt'
,'Tsca.bot':'Tsca'
,'Ty221_bot':'Ty221'
,'UlvarBOT':'Ulv80'
,'Ver-bot':'Verwolff'
,'VindiBot':'Vindicator'
,'Vinne2.bot':'Vinne2'
,'WarXboT':'WarX'
,'Wargo32.exe':'Wargo'
,'WebmajstrBot':'Webmajstr'
,'WikitanvirBot':'Wikitanvir'
,'WiktorynBot':'Wiktoryn'
,'YarluBot':'Yarl'
};

/**
 * Get data "sent" from previous page.
 * 
 * (data from url param)
 * @private
 */
$G.autoNewSectionData = function()
{
	var data = {
		title: '',
		content: '',
	};
	var reParam = new RegExp ("&newsectionname=([^&]*)", "i");	// ignoring lettercase
	var matches = reParam.exec(location.search);
	var sectxt;
	// append to input if all OK
	if (matches)
	{
		sectxt = decodeURIComponent(matches[1]);
		data.content = ';'+sectxt+'\n\n';
	}

	//
	// Add some summary
	matches = /[ ](.*)\]/.exec(sectxt);
	// append to input if all OK
	if (matches)
	{
		data.title = decodeURIComponent(matches[1]);
	}

	return data;
};

/**
 * 
 * @param {String} content 
 * @private
 */
$G.vePrependContent = function(content) {
	var rangeToReplace = new ve.Range(0),
		surfaceModel = ve.init.target.getSurface().getModel(),
		fragment = surfaceModel.getLinearFragment(rangeToReplace);
	fragment.insertContent(content);
};

/**
	@brief Inserting new section name and some info from the location string param.

	@note newsectionname url param used
*/
$G.autoNewSectionInit = function()
{
	var data = $G.autoNewSectionData();
	if (data.content.length <= 0)
	{
		return;
	}

	//
	// Discussion tools editor (VE)
	//
	// (restoring changes brakes this; plus prepending content adds nowiki tags in visual model...)
	/**
	var discussionToolsContainer = document.querySelector('.ext-discussiontools-ui-newTopic');
	if (discussionToolsContainer)
	{
		var titleEl = discussionToolsContainer.querySelector('.oo-ui-fieldLayout-field input');
		if (titleEl) {
			titleEl.value = data.title;
		}
		if (mw && mw.loader) {
			mw.loader.using( 'ext.visualEditor.desktopArticleTarget.init' ).then( function() {
				console.log('[replylinks] ve desktopArticleTarget init');
				$G.vePrependContent(data.content);
			});
		}
		return;
	}
	/**/

	//
	// Standard new-section form
	//
	var elInput = document.getElementById('wpTextbox1');
	if (elInput)
	{
		// section content (link)
		if (data.content.length > 0)
		{
			elInput.value = data.content;
		}

		// section title
		elInput = document.getElementById('wpSummary');
		if (elInput)
		{
			if (data.title.length > 0)
			{
				elInput.value = data.title;
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
				hrefReply += '&dtenable=0';	// disable dicussion tools
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
// if ($G.getMediaWikiConfig('wgAction')=='edit' 
// 	&& $G.getMediaWikiConfig('wgCanonicalNamespace')=='User_talk')
// note, wgAction=view for dynamic new-section
if (location.search.indexOf('newsectionname=') > 0 
	&& $G.getMediaWikiConfig('wgCanonicalNamespace')=='User_talk')
{
	$($G.autoNewSectionInit);
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