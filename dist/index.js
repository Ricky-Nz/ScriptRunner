'use strict';
var exec = require('child_process').exec,
	wd = require('wd'),
	path = require('path'),
	print = require('./src2/print'),
	connector = require('./src2/connector'),
	device = require('./src2/device'),
	executor = require('./src2/executor');

function start (config) {
	var appiumProcess = exec('node ' + path.join(__dirname, 'node_modules', 'appium', 'bin', 'appium.js'), {maxBuffer: 1024 * 1024 * 500}, function (error, stdout, stderr){
	    if (error) {
	    	print('red', 'Appium server error: ');
	    	print('red', error);
	    }
	});

	appiumProcess.stdout.on('data', function (data) {
		if (data.indexOf('Appium REST http interface listener started on') >= 0) {
			print('yellow', 'Start test server success.');
			var input = {};

			connector.login()
				.then(function () {
					print('yellow', '-> Select test target platform:')
					return connector.selectPlatform();
				})
				.then(function (platform) {
					input.platform = platform;

					print('yellow', '-> Select test installation package:')
					return connector.selectPackage();
				})
				.then(function (installPack) {
					input.installPack = installPack;

					print('yellow', '-> Select test script to run:');
					return connector.selectTag();
				})
				.then(function (tags) {
					input.tags = tags;
					return connector.selectScript(tags);
				})
				.then(function (scripts) {
					input.scripts = scripts;

					print('yellow', scripts.length + ' script found with tag ' + input.tags.join(','));
					return device.getDeviceVersion(input.platform);
				})
				.then(function (osVserion) {
					input.osVserion = osVserion;

					print('yellow', '-> Starting download package and install on your device...');
					input.driver = wd.promiseChainRemote({
						host: 'localhost',
						port: 4723
					});

					return input.driver.init({
						browserName: '',
						'appium-version': '1.4.13',
						platformName: input.platform,
						platformVersion: input.osVserion,
						deviceName: 'TEST DEVICE',
						app: config.server.protocol + '://' + config.server.host + ':' +
								config.server.port + config.server.path + '/storage/' + input.installPack.testerId +
								'/' + input.installPack.fileName
					});
				})
				.then(function () {
					return input.driver.setImplicitWaitTimeout(config.driver.findElementTimeout);
				})
				.then(function () {
					return input.driver.setCommandTimeout(config.driver.performActionTimeout);
				})
				.then(function () {
					print('yellow', 'Test started');
					return executor.run(input.driver, input.scripts, input.tags,
							input.platform, input.osVserion, input.installPack);
				})
				.then(function (report) {
					console.log(JSON.stringify(report));
				})
				.then(function (result) {
					print('yellow', '----------------------------------------');
					print('yellow', '------->   All Test Finished   <--------');
					print('yellow', '----------------------------------------');
				})
				.catch(function (error) {
					print('red', error.stack ? error.stack : error);
				})
				.fin(function () {
					process.exit();
				})
				.done();
		}
	});

	process.on('exit', function() {
	    appiumProcess.kill();
	});

	print('yellow', '----------------------------------------');
	print('yellow', ' Welcome to Gear Test Automation System ');
	print('yellow', '----------------------------------------');
	print('yellow', 'Starting...');
}

module.exports = {
	start: function (config) {
		start(config);
	}
}




