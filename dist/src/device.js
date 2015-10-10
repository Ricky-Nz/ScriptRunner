var Q = require('q'),
	print = require('./print'),
	prompt = require('prompt'),
	promptGet = require('./prompt'),
	exec = require('child_process').exec;

function getAndroidVersion (resolve, reject) {
	exec('adb devices', function (error, stdout, stderr) {
		if (error) {
			return reject(error);
		}

		if (stdout.indexOf('device') != stdout.lastIndexOf('device')) {
			exec('adb shell getprop ro.build.version.release', function (error, stdout, stderr) {
				if (error) {
					return reject(error);
				}

				var verison = stdout.split('\r\n')[0];
				verison = verison.replace(/(\r\n|\n|\r)/gm,"");
				if (verison) {
					resolve(verison);
				} else {
					print('red', 'Get not get os version of your devices, please re-plug you device and try again.');
					promptGet('none-version')
						.then(function () {
							getAndroidVersion(resolve, reject);
						})
						.catch(function (err) {
							reject(err);
						});
				}
			});
		} else {
			print('red', 'None device connected to your pc, please check your phone connection and try again.');
			promptGet('none-device')
				.then(function () {
					getAndroidVersion(resolve, reject);
				})
				.catch(function (err) {
					reject(err);
				});
		}
	});
}

module.exports = {
	getDeviceVersion: function (platform) {
		return Q.Promise(function (resolve, reject) {
			if (platform == 'Android') {
				getAndroidVersion(resolve, reject);
			} else {
				reject(new Error('platform ' + platform + ' not inplemented'));
			}
		});
	}
}