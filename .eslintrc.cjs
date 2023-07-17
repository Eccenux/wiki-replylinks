module.exports = {
  "env": {
    "node": true,
    "browser": true,
    "es2020": true
  },
  "globals": {
    "$": true,
    "mw": true,
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 11,
    "sourceType": "module"
  },
  "rules": {
    "no-prototype-builtins": "off",
  }
};