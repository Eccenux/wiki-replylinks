module.exports = {
	"env": {
		"node": true,
		"browser": true,
		// "es6": true
	},
	"globals": {
		"$": true,
		"mw": true,
		"$G": true,
	},
	"extends": "eslint:recommended",
	//   "parserOptions": {
	//     "ecmaVersion": 11,
	//     "sourceType": "module"
	//   },
	"rules": {
		"no-prototype-builtins": "off",
	},
	"overrides": [{
		"files": ["**/*.mjs"],
		"parserOptions": {
			"ecmaVersion": 11,
			"sourceType": "module"
		},
	}],
};