'use strict';
var request = require('request'),
	Q = require('q'),
	prompt = require('prompt'),
	logger = require('./logger'),
	exec = require('child_process').exec;

function findFolderByKey (folderBundle, targetIndex) {
	for (var key in folderBundle) {
		var folder = folderBundle[key];
		if (folder.index == targetIndex) {
			return folder.id;
		}
	}
}

function findScriptByKey (folderBundle, targetIndex) {
	for (var key in folderBundle) {
		var folder = folderBundle[key];

		for (var index in folder.scripts) {
			var script = folder.scripts[index];
			if (script.index == targetIndex) {
				return script.id;
			}
		}
	}
}

function loopPromptGet (schema, taregtArray, title, callback) {
	prompt.start();
	prompt.get(schema, function (err, result) {
		if (err) {
			callback();
		}

		if (!result || !taregtArray[result[title] - 1]) {
			loopPromptGet(schema, taregtArray, title, callback);
		} else {
			callback(taregtArray[result[title] - 1]);
		}
	});
}

function selectTestScripts (config, username) {
	var deferred = Q.defer();

	request({
		url: config.protocol + '://' + config.host + config.path + '/api/client/script',
		qs: {
			username: username,
			type: 'Script'
		},
		json: true
	}, function (error, response, body) {
		if (!body || !body.success) {
			return deferred.reject(body);
		}

		var resultData = body.data;
		for (var key in resultData) {
			var folder = resultData[key];
			logger('green', folder.index + ' ' + key);
			folder.scripts.forEach(function (script) {
				logger('green', '  ' + script.index + ' ' + script.title);
			});
		}
		logger('yellow', '请选择要执行的脚本编号，多个脚本用空格隔开:');
		var message = '请输入正确的脚本编号，如 1.1 3.4，多个脚本用空格隔开';

		var schema = {
			properties: {
				'脚本编号': {
					pattern: /^[0-9\s\.]+$/,
					message: message,
					required: true
				}
			}
		};

		prompt.start();
		prompt.get(schema, function (err, result) {
			if (err) {
				deferred.reject(err);
			} else {
				var idList = [];
				var indexs = result['脚本编号'].trim();
				var indexList = indexs.split(' ');

				var selectFolders = [];
				var selectScripts = [];
				indexList.forEach(function (item) {
					if (item.indexOf('.') > 0) {
						var id = findScriptByKey(resultData, item);
						if (id) {
							selectScripts.push(id);
						}
					} else {
						var id = findFolderByKey(resultData, item);
						if (id) {
							selectFolders.push(id);
						}
					}
				});

				deferred.resolve({
					folders: selectFolders.join(','),
					scripts: selectScripts.join(',')
				});
			}
		});
	});

	return deferred.promise;
}

function selectConfigScripts (config, username) {
	var deferred = Q.defer();

	request({
		url: config.protocol + '://' + config.host + config.path + '/api/client/script',
		qs: {
			username: username,
			type: 'SysConfig'
		},
		json: true
	}, function (error, response, body) {
		if (!body || !body.success) {
			return deferred.reject(body);
		}

		var resultData = body.data;

		if (!resultData || resultData.length <= 0) {
			return deferred.resolve();
		}

		logger('green', '  ' + 0 + ' ' + '无配置');
		resultData.forEach(function (script) {
			logger('green', '  ' + script.index + ' ' + script.title);
		});
		logger('yellow', '请选择配置脚本编号:');
		var message = '请输入正确的脚本编号，如 1';

		var schema = {
			properties: {
				'脚本编号': {
					pattern: /^[0-9\s\.]+$/,
					message: message,
					default: 0,
					required: true
				}
			}
		};

		prompt.start();
		prompt.get(schema, function (err, result) {
			if (err) {
				deferred.reject(err);
			} else {
				var id = findFolderByKey(resultData, result['脚本编号'].trim());
				deferred.resolve(id);
			}
		});
	});

	return deferred.promise;
}

function fetchScriptContent (config, username, scripts, folders, env) {
	var deferred = Q.defer();

	request({
		url: config.protocol + '://' + config.host + config.path + '/api/client/detail',
		qs: {
			username: username,
			scripts: scripts,
			folders: folders,
			env: env
		},
		json: true
	}, function (error, response, body) {
		if (!body || !body.success) {
			return deferred.reject(body);
		}

		deferred.resolve(body);
	});

	return deferred.promise;
}

function getDeviceVersion (callback) {
	exec('adb devices', function (error, stdout, stderr) {
		if (stdout.indexOf('device') != stdout.lastIndexOf('device')) {
			exec('adb shell getprop ro.build.version.release', function (error, stdout, stderr) {
				var verison = stdout.split('\r\n')[0];
				verison = verison.replace(/(\r\n|\n|\r)/gm,"");
				if (verison) {
					callback(verison);
				} else {
					prompt.start();
					prompt.get({
						properties: {
							'无法获取设备系统版本信息，请重新插入手机并按回车继续': {
								message: ''
							}
						}
					}, function (err, result) {
						if (err) {
							callback(undefined, err);
						} else {
							getDeviceVersion(callback);
						}
					});
				}
			});
		} else {
			prompt.start();
			prompt.get({
				properties: {
					'没找找到可用的Android设备，请插入Adnroid设备并按回车继续': {
						message: ''
					}
				}
			}, function (err, result) {
				if (err) {
					callback(undefined, err);
				} else {
					getDeviceVersion(callback);
				}
			});
		}
	});
}

module.exports = {
	enterTestUser: function () {
		var deferred = Q.defer();

		var schema = {
			properties: {
				'测试账号': {
					message: '请输入测试账号',
					required: true
				}
			}
		};

		logger('yellow', '请输入测试账号:');
		prompt.start();
		prompt.get(schema, function (err, result) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(result['测试账号']);
			}
		});

		return deferred.promise;
	},
	selectTargetPlatform: function (config) {
		var deferred = Q.defer();

		request({
			url: config.protocol + '://' + config.host + config.path + '/api/client/platform',
			json: true
		}, function (error, response, body) {
			if (error || !body || !body.success) {
				return deferred.reject('get platform request failed!');
			}

			var schema = {
				properties: {
					'测试平台': {
						type: 'number',
						default: 1,
						message: '请输入正确的平台编号，如 1',
						required: true
					}
				}
			};

			var platforms = [];
			body.data.forEach(function (platform, index) {
				if (platform.ready) {
					logger('green', (index + 1) + ' ' + platform.name);
					platforms.push(platform.name);
				} else {
					logger('gray', (index + 1) + ' ' + platform.name);
					platforms.push(undefined);
				}
			});

			logger('yellow', '请选择要测试的平台编号:');
			loopPromptGet(schema, platforms, '测试平台', function (platform) {
				if (platform) {
					deferred.resolve(platform);
				} else {
					deferred.reject();
				}
			});
		});

		return deferred.promise;
	},
	selectAppPackage: function (config, username, platform) {
		var deferred = Q.defer();

		request({
			url: config.protocol + '://' + config.host + config.path + '/api/client/package',
			qs: {
				username: username,
				platform: platform
			},
			json: true
		}, function (error, response, body) {
			if (error || !body || !body.success) {
				return deferred.reject('get packages request failed!');
			}

			if (!body.data || body.data.length <= 0) {
				return deferred.reject('None package found for user ' + username + ' on platform ' + platform + ', please uplaod test package first');
			}

			var schema = {
				properties: {
					'选择测试包': {
						type: 'number',
						message: '请输入正确的脚本编号，如 1',
						required: true
					}
				}
			};

			var downloadlist = [];
			body.data.forEach(function (item, index) {
				downloadlist.push(item.download);
				logger('green', (index + 1) + ' ' + item.title);
			});

			logger('yellow', '请选择测试包编号:');
			loopPromptGet(schema, downloadlist, '选择测试包', function (downlaodLink) {
				if (downlaodLink) {
					deferred.resolve(downlaodLink);
				} else {
					deferred.reject();
				}
			});
		});

		return deferred.promise;
	},
	selectTestScripts: function (config, username) {
		return selectTestScripts(config, username);
	},
	selectConfigScripts: function (config, username) {
		return selectConfigScripts(config, username);
	},
	fetchScriptContent: function (config, username, scripts, folders, env) {
		return fetchScriptContent(config, username, scripts, folders, env);
	},
	ensureDevive: function () {
		var defered = Q.defer();

		getDeviceVersion(function (version, err) {
			if (err) {
				defered.reject(err);
			} else {
				defered.resolve(version);
			}
		});

		return defered.promise;
	}
}



