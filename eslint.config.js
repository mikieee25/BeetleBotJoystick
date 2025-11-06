const eslintPluginExpo = require("eslint-plugin-expo");
const js = require("@eslint/js");

module.exports = [js.configs.recommended, eslintPluginExpo.configs.recommended];
