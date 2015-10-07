var targz = require('tar.gz'),
	path = require('path'),
	request = require('request'),
	fs = require('fs-extra'),
	Q = require('q'),
	logger = require('./logger');

module.exports = {
	uploadReport: function (config, report) {
		var defered = Q.defer();

		var uploadFile = path.join(__dirname,'..', 'report.tar.gz');
		if (!fs.existsSync(uploadFile)) {
			fs.removeSync(uploadFile);
		}

		new targz().compress(path.join(__dirname, '..', 'screenshoot'), uploadFile, function (err, response) {
		    if (err) {
		        return defered.reject(err);
		    }

			var formData = {
				report: JSON.stringify(report),
				// Pass data via Streams
				reportZip: fs.createReadStream(uploadFile)
			};

			request.post({
				url: config.protocol + '://' + config.host + config.path + '/api/report',
				formData: formData,
				json: true
			}, function (err, httpResponse, body) {
				if (err) {
					return defered.reject(err);
				}

				if (body.success) {
					defered.resolve(true);
				} else {
					defered.reject(new Error('upload report failed: ' + body.data));
				}
			});
		});

		return defered.promise;
	}
}

