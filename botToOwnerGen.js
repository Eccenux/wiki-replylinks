/**
 * Pobieranie listy botów.
 * 
 * Do użycia na:
 * https://pl.wikipedia.org/wiki/Wikipedia:Boty
 * 
 * Do podmiany obiekt `oBotToOwner`.
 */
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
	for (let botName of sortedKeys) {
		botString += `\n,'${botName}':'${bots[botName]}'`;
	}
	return botString;
}
console.log(botStrings(bots));
// copy to clipboard
copy(botStrings(bots));
