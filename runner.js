var path = require('path'),
	config = require('./config');

var runner = require(path.join(__dirname, 'index.js'));
runner.start(config);
