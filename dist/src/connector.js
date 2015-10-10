var Q = require('q'),
	request = require('request'),
	print = require('./print'),
	path = require('path'),
	fs = require('fs'),
	config = require('../../config'),
	_ = require('underscore'),
	promptGet = require('./prompt');

function runLogin (resolve, reject, user) {
	request({
		method: 'post',
		url: config.server.protocol + '://' + config.server.host + ':'
			+ config.server.port + config.server.path + '/api/testers/login',
		json: user
	}, function (error, response, body) {
		if (error || !body.id) {
			return reject('username or password is not correct!');
		}

		fs.writeFileSync(path.join(__dirname, 'session'), JSON.stringify(body));

		resolve(body);
	});
}

function login (resolve, reject, force) {
	var user = getLoginUser();

	if (!force && user) {
		return resolve(user);
	}

	if (config.user && config.email && config.password) {
		runLogin(resolve, reject, config.user);
	} else {
		promptGet('login')
			.then(function (user) {
				runLogin(resolve, reject, user);
			})
			.catch(function (err) {
				reject(err);
			});
	}
}

function selectPlatform (resolve, reject) {
	var user = getLoginUser();

	request({
		url: config.server.protocol + '://' + config.server.host + ':'
			+ config.server.port + config.server.path + '/api/clients/platform',
		qs: {
			access_token: user.id
		},
		json: true
	}, function (error, response, body) {
		if (sessionExipre(response, reject)) return;

		if (error || !body.platforms || body.platforms.length < 0) {
			return reject(error ? error : new Error('get platform failed!'));
		}

		var platforms = [];
		body.platforms.forEach(function (platform, index) {
			if (platform.ready) {
				print('green', (index + 1) + ' ' + platform.name);
				platforms.push(platform.name);
			} else {
				print('gray', (index + 1) + ' ' + platform.name);
				platforms.push(undefined);
			}
		});

		promptGet('platform', function (value) {
			return value > 0 && value <= platforms.length;
		}).then(function (result) {
			resolve(platforms[result.platform - 1]);
		}).catch(function (err) {
			reject(err);
		})
	});
}

function selectPackage (resolve, reject) {
	var user = getLoginUser();

	request({
		url: config.server.protocol + '://' + config.server.host + ':'
			+ config.server.port + config.server.path + '/api/testers/' + user.userId + '/packages',
		qs: {
			access_token: user.id
		},
		json: true
	}, function (error, response, body) {
		if (sessionExipre(response, reject)) return;

		if (error || !body.data || body.data.length < 0) {
			return reject(error ? error : new Error('get package failed!'));
		}

		body.data.forEach(function (data, index) {
			print('green', (index + 1) + ' ' + data.title);
			print('gray', '    ' + data.description);
		});

		promptGet('package', function (value) {
			return value > 0 && value <= body.data.length;
		}).then(function (result) {
			resolve(body.data[result.package - 1]);
		}).catch(function (err) {
			reject(err);
		})
	});
}

function selectTag (resolve, reject) {
	var user = getLoginUser();
	
	request({
		url: config.server.protocol + '://' + config.server.host + ':'
			+ config.server.port + config.server.path + '/api/testers/tags',
		qs: {
			access_token: user.id,
		},
		json: true
	}, function (error, response, body) {
		if (sessionExipre(response, reject)) return;

		if (error || !body.tags || body.tags.length < 0) {
			return reject(new Error('None of script/tag found'));
		}

		print('green', body.tags.join(','));

		promptGet('tag', function (value) {
			var selectTags = value.split(' ');
			return !_.find(selectTags, function (tag) {
				return !_.contains(body.tags, tag);
			});
		}).then(function (result) {
			resolve(result.tag.split(' '));
		}).catch(function (err) {
			reject(err);
		});
	});
}

function selectScript (resolve, reject, tags) {
	var user = getLoginUser();

	request({
		url: config.server.protocol + '://' + config.server.host + ':'
			+ config.server.port + config.server.path + '/api/testers/' + user.userId +'/scripts',
		qs: {
			access_token: user.id,
			filter: JSON.stringify({where: {tags: {inq: tags}}})
		},
		json: true
	}, function (error, response, body) {
		if (sessionExipre(response, reject)) return;

		if (error || !body.data || body.data.length < 0) {
			return reject(new Error('None of script/tag found'));
		}

		resolve(body.data);
	});
}

function uploadReport (resolve, reject, report) {
	var user = getLoginUser();

	request({
		method: 'post',
		url: config.server.protocol + '://' + config.server.host + ':'
			+ config.server.port + config.server.path + '/api/testers/' + user.userId +'/reports',
		qs: {
			access_token: user.id
		},
		json: report
	}, function (error, response, body) {
		if (sessionExipre(response, reject)) return;

		if (error) {
			reject(error);
		} else {
			resolve(body);
		}
	});
}

function sessionExipre (response, reject) {
	if (response.statusCode == 401) {
		fs.unlinkSync(path.join(__dirname, 'session'));
		reject('Login session expired.');
		return true
	}
}

function getLoginUser () {
	if (fs.existsSync(path.join(__dirname, 'session'))) {
		var session = fs.readFileSync(path.join(__dirname, 'session'));
		if (session) {
			return JSON.parse(session);
		}
	}
}

module.exports = {
	login: function () {
		return Q.Promise(function (resolve, reject) {
			login(resolve, reject, false);
		});
	},
	selectPlatform: function () {
		return Q.Promise(function (resolve, reject) {
			return selectPlatform(resolve, reject);
		});
	},
	selectPackage: function () {
		return Q.Promise(function (resolve, reject) {
			return selectPackage(resolve, reject);
		});
	},
	selectTag: function () {
		return Q.Promise(function (resolve, reject) {
			return selectTag(resolve, reject);
		});
	},
	selectScript: function (tags) {
		return Q.Promise(function (resolve, reject) {
			return selectScript(resolve, reject, tags);
		});
	},
	uploadReport: function (report) {
		return Q.Promise(function (resolve, reject) {
			return uploadReport(resolve, reject, report);
		});
	}
}

