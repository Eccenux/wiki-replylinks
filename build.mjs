import fsa from 'fs/promises'
import fs from 'fs'

import {verlib} from 'wikiploy';
import {version} from './version.mjs';


/** Prepare all JS files. */
export async function build_js() {
	const buildConf = [
		'replylinks.js',
	];
	const includes = [
		'bots.plwiki.js',
	];

	// merge main JS
	let rawJs = '';
	for (let i = 0; i < buildConf.length; i++) {
		const file = buildConf[i];
		let content = readFileUtf(file);
		rawJs += content + '\n';
	}

	let js = verlib.applyVersion(rawJs, version);
	js = includeFiles(includes, js);
	await fsa.writeFile('replylinks.dev.js', js);

	return true;
}

/** BOM safe file read. */
function readFileUtf(file) {
	let content = fs.readFileSync(`${file}`, 'utf8');
	// remove BOM
	if (content.charCodeAt(0) === 0xFEFF) {
		content = content.substring(1);
	}
	return content;
}

/**
 * Include files.
 * 
 * Replace in comments:
 * $inc{some.file.js}
 * 
 * @param {Array} files 
 * @param {String} js 
 */
function includeFiles(files, js) {
	// replace: /*$inc{some.file.js}*/
	return js.replace(/\/\*[ \t]*\$inc\{([^}]+)\}[ \t]*\*\//, (a, name)=>{
		if (files.indexOf(name) < 0) {
			console.warn('Unknown name: %s.', name);
			return a;
		}
		let content = readFileUtf(name);
		return content;
	});
}

/**/
(async () => {
	console.log(new Date().toISOString(), 'start');
	await build_js();
	console.log(new Date().toISOString(), 'done');
})();
/**/
