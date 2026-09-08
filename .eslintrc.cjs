module.exports = {
	"env": {
		"node": true,
		"browser": true,
	},
	"globals": {
		"$": true,
		"mw": true,
		"$G": true,
		"UserConfig": true,
	},
	"extends": "eslint:recommended",
	"parserOptions": {
		"ecmaVersion": 2019,
		"sourceType": "module"
	},
	"rules": {
		"no-prototype-builtins": "off",
	},
	"overrides": [{
		"files": ["**/*.mjs"],
		"parserOptions": {
			"ecmaVersion": 2020,
			"sourceType": "module"
		},
	}],
};