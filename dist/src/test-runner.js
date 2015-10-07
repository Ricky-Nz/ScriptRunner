var logger = require('./logger'),
	elementFinder = require('./element-finder'),
	alikeyboard = require('./alikeyboard'),
	reportor = require('./reportor'),
	path = require('path'),
	fs = require('fs-extra'),
	Q = require('q');

var elementAction = [
	'点击',
	'点击位置',
	'点击图片',
	'清除',
	'输入',
	'选择',
	'快速选择',
	'单选位置',
	'多选位置'
];

var phoneAction = [
	'BACK',
	'向上滚动',
	'向下滚动',
	'向左滑动',
	'向右滑动',
	'阿里键盘输入',
	'阿里密码输入',
	'阿里数字键盘输入',
];

var verification = [
	'文案校验'
];

function sendElementCommand (element, action) {
	logger('yellow', '--执行> ' + action.type);
	switch (action.type) {
		case '清除':
			return element.clear();
		case '点击':
		case '点击位置':
		case '点击图片':
		case '选择':
		case '单选位置':
		case '多选位置':
			return element.click();
		case '输入':
			logger('yellow', '--参数> ' + action.param);
			return element.sendKeys(action.param);
		case '文案校验':
			return true;
		default:
			throw new Error('Action type not support: ' + action.type);
	}
}

function sendPhoneCommand (action, driver) {
	logger('yellow', '--执行> ' + action.type);
	switch (action.type) {
		case '阿里键盘输入':
			logger('yellow', '--参数> ' + action.target.name);
			return alikeyboard.input(action.target.name, false, driver);
		case '阿里密码输入':
		case '阿里数字键盘输入':
			logger('yellow', '--参数> ' + action.target.name);
			return alikeyboard.input(action.target.name, true, driver);
		case '向上滚动':
			return driver.getWindowSize()
				.then(function (window) {
					return driver.flick(0, window.height * 3 / 4);
				});
		case '向下滚动':
			return driver.getWindowSize()
				.then(function (window) {
					return driver.flick(0, -(window.height * 3 / 4));
				});
		case '向左滑动':
			return driver.getWindowSize()
				.then(function (window) {
					return driver.flick((window.width * 3 / 4), 0);
				});
		case '向右滑动':
			return driver.getWindowSize()
				.then(function (window) {
					return driver.flick(-(window.width * 3 / 4), 0);
				});
		case 'BACK':
			return driver.back();
		default:
			throw new Error('Action type not support: ' + action.type);
	}
}

function screenShoot (driver, callback) {
	var fielName = Date.now().toString();

	driver.sleep(500)
		.then(function () {
			return driver.saveScreenshot(path.join(__dirname, '..', 'screenshoot', fielName));
		})
		.then(function (path) {
			callback(fielName + '.png');
		})
		.catch(function () {
			callback();
		});
}

function performActon (driver, action, actionIndex, actionRecords) {
	var defered = Q.defer();

	driver.hideKeyboard({strategy: 'pressKey', key:'done'})
		.fin(function () {
			var actionRecord = {
				title: action.type + ' ' + JSON.stringify(action.target)
					+ ' ' + (action.param ? action.param : '')
			};

			var actionPromise;

			try {
				actionRecords.push(actionRecord);

				if (phoneAction.indexOf(action.type) >= 0) {
					actionPromise = sendPhoneCommand(action, driver);
				} else if (elementAction.indexOf(action.type) >= 0) {
					var target = action.target;

					switch (target.type) {
						case 'LOCATION':
							logger('yellow', '--位置查找> ' + target.view + '[' + target.location + ']');
							actionPromise = driver.setImplicitWaitTimeout(20000)
								.then(function () {
									return driver.elementsByClassName(target.view);
								})
								.then(function (elements) {
									var element = elements[target.location];
									return sendElementCommand(element, action, driver);
								});
							break;
						case 'NAME':
							if (target.name instanceof Array) {
								logger('yellow', '--多选查找> ' + target.name.toString());
								// test find timeout is short, so we wait for a litle while
								actionPromise = driver.sleep(2500)
									.then(function () {
										return elementFinder.findElementByNameArray(driver, target.name);
									})
									.then(function (element) {
										return sendElementCommand(element, action, driver);
									});
							} else if (action.type == '快速选择') {
								actionPromise = elementFinder.quickSelectElement(driver, target.name);
							} else {
								logger('yellow', '--名称查找> ' + target.name);
								actionPromise = elementFinder.findElementByName(driver, target.name, 2, 20000)
									.then(function (element) {
										return sendElementCommand(element, action, driver);
									});
							}
							break;
						default:
							actionPromise = Q.fcall(function () {
								throw new Error('Element target type not support: ' + target.type);
							});
					}
				} else if (verification.indexOf(action.type) >= 0) {
					var target = action.target;
					logger('yellow', '--文案校验> ' + target.name);
					actionPromise = elementFinder.findElementByName(driver, target.name, 4, 10000);
				} else {
					actionPromise = Q.fcall(function () {
						throw new Error('Action type not support: ' + action.type);
					});
				}
			} catch (err) {
				actionPromise = Q.fcall(function () {
					throw err;
				});
			} finally {
				actionPromise
					.then(function () {
						actionRecord.success = true;
						actionRecord.date = new Date();
						screenShoot(driver, function (fileName) {
							actionRecord.image = fileName;
							defered.resolve(actionIndex + 1);
						});
					})
					.catch(function (err) {
						actionRecord.success = false;
						actionRecord.date = new Date();
						actionRecord.err = err.stack;
						screenShoot(driver, function (fileName) {
							actionRecord.image = fileName;
							defered.reject(err);
						});
					});
			}
		});

	return defered.promise;
}

function performScript (script, config, driver, scriptIndex, scriptTotal, scriptRecord) {
	var defered = Q.defer();

	driver
		.sleep(4000)
		.then(function () {
			var scriptActions = Q(0);

			// 1. script start, print script title first.
			scriptActions = scriptActions.then(function (index) {
				return Q.fcall(function (index) {
					logger('yellow', '----------> ' + script.title + '  ' + (scriptIndex + 1) + '/' + scriptTotal + ' <----------');
					return index;
				}, index);
			});

			// 2. if there is a config script, run config script first.
			if (config && config.actions) {
				// 2.1 config script actions.
				config.actions.forEach(function () {
					scriptActions = scriptActions.then(function (index) {
						return performActon(driver, config.actions[index], index, scriptRecord.actions);
					});
				});

				// 2.2 reset runtime action index to 0.
				scriptActions = scriptActions.then(function () {
					return Q.fcall(function () {
						return 0;
					});
				});
			}

			// 3. run scirpt actions in roder.
			script.actions.forEach(function () {
				scriptActions = scriptActions.then(function (index) {
					return performActon(driver, script.actions[index], index, scriptRecord.actions);
				});
			});

			// 4. script test finished.
			scriptActions
				.then(function () {
					logger('green', '----------------------------------------');
					logger('green', ' ' + script.title + '  Success');
					logger('green', '----------------------------------------');
					scriptRecord.success = true;
				})
				.catch(function (err) {
					logger('red', '----------------------------------------');
					logger('red', '-- ' + script.title + '  Error');
					logger('red', err.stack);
					logger('red', '----------------------------------------');
					scriptRecord.success = false;
				})
				.fin(function () {
					driver.resetApp()
						.fin(function () {
							defered.resolve(scriptIndex + 1);
						});
				})
				.done();
		})
		.catch(function (err) {
			defered.resolve(scriptIndex + 1);
		});

	return defered.promise;
}

module.exports = {
	start: function (driver, scripts, configScript, username, sysConfig) {
		var defered = Q.defer();

		try {
			var scriptTasks = Q(0);

			var targetFolder = path.join(__dirname, '..', 'screenshoot');
			if (!fs.existsSync(targetFolder)) {
				fs.mkdirSync(targetFolder);
			} else {
				fs.emptyDirSync(targetFolder);
			}

			var date = new Date();
			var reportTitle = date.toString().replace(/ /g, "-").replace(/\+/g, "-").replace(/:/g, "-")
					+ '-' + Date.now();
			var report = {
				title: reportTitle,
				username: username,
				items: []
			};

			// run scripts in server returned order
			scripts.forEach(function () {
				scriptTasks = scriptTasks.then(function (index) {
					var script = scripts[index];
					var scriptRecord = {
						title: script.title,
						actions: []
					};
					report.items.push(scriptRecord);
					return performScript(script, configScript, driver, index, scripts.length, scriptRecord);
				});
			});

			scriptTasks
				.then(function () {
					if (report.items.length > 0) {
						return reportor.uploadReport(sysConfig, report);
					} else {
						return false;
					}
				})
				.then(function (upload) {
					if (upload) {
						logger('green', 'Upload report success');
					}
					defered.resolve();
				})
				.catch(function (err) {
					defered.reject(err);
				});
		} catch (err) {
			defered.reject(err);
		}

		return defered.promise;
	}
}

