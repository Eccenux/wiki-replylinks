import fsa from 'fs/promises'

import {verlib} from 'wikiploy';
import {version} from './version.mjs';


/** Prepare all JS files. */
export async function build_js() {
	const buildConf = [
		'replylinks.js',
	];

	// merge main JS
	let rawJs = '';
	for (let i = 0; i < buildConf.length; i++) {
		const file = buildConf[i];
		let content = await fsa.readFile(`${file}`, 'utf8');
		// remove BOM
		if (content.charCodeAt(0) === 0xFEFF) {
			content = content.substring(1);
		}
		rawJs += content + '\n';
	}

	let js = verlib.applyVersion(rawJs, version);
	await fsa.writeFile('replylinks.dev.js', js);

	return true;
}

/**/
(async () => {
	console.log(new Date().toISOString(), 'start');
	await build_js();
	console.log(new Date().toISOString(), 'done');
})();
/**/
