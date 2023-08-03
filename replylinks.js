/**
	@file Odpowiedzi z linkami (Reply links with backtrack links)
	v{version}

	Opis (pl):
		- http://pl.wikipedia.org/wiki/Wikipedia:Narz%C4%99dzia/Odpowiedzi_z_linkami

    Main functions:
		- adding reply links near user links
		- inserting text given in newsectionname (as PHP param in the location string of the page)

    Copyright:  ©2006-2023 Maciej Jaros (pl:User:Nux, en:User:EcceNux)
     Licencja:  GNU General Public License v2
                http://opensource.org/licenses/gpl-license.php

	@note Please keep MW 1.16 compatible (i.e. do not use mw.config directly)
	@note jQuery is required though
	
	@note Dev version: http://pl.wikipedia.org/wiki/Wikipedysta:Nux/replylinks.dev.js
	@note Prod version: https://pl.wikipedia.org/wiki/MediaWiki:Gadget-replylinks.js

	@note Repo, bugz, pull requests: https://github.com/Eccenux/wiki-replylinks/
*/
// <nowiki>
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
oRepLinks.version = oRepLinks.ver = '{version}';

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

/** Configurable by users. */
$G.options = {
	boolAddSignature: true,
};

/**
 * Prepare options from user config.
 * @param {UserConfig} userConfig 
 */
$G.prepareConfig = async function (userConfig) {
	await userConfig.register();

	const userOptions = [
		'boolAddSignature',
	];
	for (const option of userOptions) {
		let value = userConfig.get(option);
		this.options[option] = value;
	}
	mw.hook('userjs.replylinks.configReady').fire();
},

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

/*$inc{bots.plwiki.js}*/

/*$inc{UserConfig.js}*/

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
	// Standard new-section form
	//
	var elInput = document.getElementById('wpTextbox1');
	if (elInput)
	{
		// section content (link)
		if (data.content.length > 0)
		{
			let content = (this.options.boolAddSignature) ? data.content + '\n--'+'~'+'~'+'~'+'~' : data.content;
			// link + signature
			elInput.value = content;
		}

		// setup post-save action(s)
		$G.setupPostSave(elInput);

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

/** @private Setup form for post-save action(s) like subscription. */
$G.setupPostSave = function(textbox)
{
	textbox = document.getElementById('wpTextbox1');
	var summary = document.querySelector('#wpSummary');
	if (!textbox || !summary) {
		console.error('[replylinks]', 'setupPostSave failed');
		return;
	}
	textbox.form.addEventListener('submit', function(){
		// auto-subscriptions: https://github.com/Eccenux/wiki-replylinks/issues/2
		$G.prepareSub(summary);
	});
};

/** @private Prepare for subscription. */
$G.prepareSub = function(summary)
{
	var state = {};
	// save state before submit: title, with time
	state.title = summary.value;
	state.time = (new Date()).getTime();
	// also save "relevant" user name
	state.user = $G.getMediaWikiConfig('wgRelevantUserName');
	$G.saveState(state);
};

/**
 * Max deltaT between submit and load [s].
 */
$G.maxValidTime = 60;

/** @private Check to make a subscription. */
$G.checkSub = function()
{
	var state = $G.readState();
	// basic state validation
	if (!(state && typeof state === 'object' && state.title)) {
		return;
	}
	// check for subscription data
	var sub = $G.findSub();
	if (!sub) {
		return;
	}
	// after submit check user is the same
	var user = $G.getMediaWikiConfig('wgRelevantUserName');
	if (user !== state.user) {
		return;
	}
	// if now()-time > maxtime => remove state
	var now = (new Date()).getTime();
	var deltaT = Math.round((now - state.time) / 1000);
	if (deltaT > $G.maxValidTime) {
		$G.removeState();
		console.warn('[replylinks] stale state: now()-time: %d [s]', deltaT);
		return;
	}
	// if OK => subscribe; remove state
	$G.addSub(sub.pageTitle, sub.sectionTitle, sub.commentname);
	$G.removeState();
};

/** @private Find subscription data. */
$G.findSub = function()
{
	// check for subscription links first (or sub placeholders)
	var els = document.querySelectorAll('.ext-discussiontools-init-section-subscribeButton');
	if (!els.length) {
		return false;
	}
	// we could just get href from above, but sadly href is not avilable right after save...
	//var sub = new URL(el.querySelector('a').href);
	// so instead...

	// I hate this but it works 🙃
	var section = Array.from(document.querySelectorAll('.ext-discussiontools-init-section')).pop();
	if (!section) {
		return false;
	}
	var h = section.querySelector('.mw-headline');
	if (!h) {
		return false;
	}
	var pageTitle = mw.config.get('wgRelevantPageName');
	var sectionTitle = h.id;
	// convert thread-id to subscriptions format... sadly not the same :-/
	var commentname = h.getAttribute('data-mw-thread-id').replace(h.id, mw.config.get('wgUserName'));
	return {pageTitle:pageTitle, sectionTitle:sectionTitle, commentname:commentname};
};

/** @private Add subscription. */
/**
 * 
 * @param {String} pageTitle 
 * @param {String} sectionTitle Not encoded. E.g. "Odp:Próba wiadoma 3"
 * @param {String} commentname 
 */
$G.addSub = function(pageTitle, sectionTitle, commentname)
{
	new mw.Api().postWithEditToken( {
		action: 'discussiontoolssubscribe',
		formatversion : '2',
		page : pageTitle + '#' + sectionTitle,
		commentname : commentname,
		subscribe : 'true',
	} );
};

// on load
if ($G.getMediaWikiConfig('wgAction')=='view'
	&& $G.getMediaWikiConfig('wgCanonicalNamespace')=='User_talk')
{
	$(function(){
		setTimeout(function () {
			$G.checkSub();
		}, 100);
	});
}

// temporary subscription storage
$G._stateKey = 'userjs.replylinks.sub';

/** @private Save post-form state. */
$G.saveState = function(state)
{
	console.log('[replylinks]', 'saveState', state);
	localStorage.setItem($G._stateKey, JSON.stringify(state));
};
/** @private Read post-form state. */
$G.readState = function()
{
	var rawState = localStorage.getItem($G._stateKey);
	var state = JSON.parse(rawState);
	console.log('[replylinks]', 'readState', state);
	return state;
};
/** @private Clear post-form state. */
$G.removeState = function()
{
	localStorage.removeItem($G._stateKey);
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
				if (!(header instanceof Element)) {
					found = false;
					break;
				}
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
	var resultArray = [];
	$(list, obj).each(function(){
		resultArray.push(this);
	});
	return resultArray;
};

// gConfig init
mw.hook('userjs.gConfig.ready').add(function (gConfig) {
	let userConfig = new UserConfig(gConfig);
	$G.prepareConfig(userConfig);
});

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
	$(function(){
		mw.hook('userjs.replylinks.configReady').add(function(){
			$G.autoNewSectionInit();
		});
	});
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
// </nowiki>
})(oRepLinks);