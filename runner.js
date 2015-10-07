var path = require('path'),
	config = require('./config');

var runner = require(path.join(__dirname, 'dist', 'index.js'));
runner.start(config);
