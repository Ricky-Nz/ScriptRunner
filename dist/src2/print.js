var colors = require('colors/safe');

module.exports = function (color, text) {
	console.log(colors[color](text));
}