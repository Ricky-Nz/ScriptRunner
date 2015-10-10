var Q = require('q'),
	print = require('./print'),
	wd = require('wd'),
	reporter = require('./reporter');

function performAction (action, element, driver) {
	var type = action.actionType ? action.actionType.toUpperCase() : null;

	switch(type) {
		case 'CLICK':
			print('yellow', '-> click element ' + element);
			return element.click();
		case 'INPUT':
			print('yellow', '-> input ' + action.actionArgs + ' to element ' + element);
			return element.sendKeys(action.actionArgs);
		case 'TOUCH':
			if (action.actionArgs && action.actionArgs.match(/\((\d*\.?\d+), ?(\d*\.?\d+)\)/)) {
				var regResult = action.actionArgs.match(/\((\d*\.?\d+), ?(\d*\.?\d+)\)/);
			    var touchAction = new wd.TouchAction();
			    touchAction.press({
			    	x: regResult[1],
			    	y: regResult[2]
			    }).release();

			    print('yellow', '-> touch at x: ' + regResult[1] + ', y:' + regResult[2]);
				return driver.performTouchAction(touchAction);
			} else {
				throw new Error('Illegal touch action arguments: ' + action.actionArgs);
			}
		case 'TOUCHRELATIVE':
			if (action.actionArgs && action.actionArgs.match(/\((0\.\d+), ?(0\.\d+)\)/)) {
				return driver.getWindowSize()
					.then(function (window) {
						var regResult = action.actionArgs.match(/\((0\.\d+), ?(0\.\d+)\)/);
					    var touchAction = new wd.TouchAction();
					    var posX = window.width * regResult[1];
					    var posY = window.height * regResult[2];
					    touchAction.press({
					    	x: posX,
					    	y: posY
					    }).release();

					    print('yellow', '-> relative touch at x: ' + posX + '(' + regResult[1] + ') '
					    		+ ', y:' + posY + '(' + regResult[2] + ')');
						return driver.performTouchAction(touchAction);
					});
			} else {
				throw new Error('Illegal touch-relative action arguments: ' + action.actionArgs);	
			}
		case 'CLEARINPUT':
			print('yellow', '-> clear element ' + element);
			return element.clear();
		case 'FLICKUP':
			print('yellow', '-> screen scroll up');
			return driver.getWindowSize()
				.then(function (window) {
					return driver.flick(0, window.height * 3 / 4);
				});
		case 'FLICKDOWN':
			print('yellow', '-> screen scroll down');
			return driver.getWindowSize()
				.then(function (window) {
					return driver.flick(0, -(window.height * 3 / 4));
				});
		case 'FLICKLEFT':
			print('yellow', '-> screen scroll left');
			return driver.getWindowSize()
				.then(function (window) {
					return driver.flick((window.width * 3 / 4), 0);
				});
		case 'FLICKRIGHT':
			print('yellow', '-> screen scroll right');
			return driver.getWindowSize()
				.then(function (window) {
					return driver.flick(-(window.width * 3 / 4), 0);
				});
		case 'BACK':
			print('yellow', '-> back');
			return driver.back();
		case 'WAIT':
			print('yellow', '-> wait ' + action.actionArgs + ' in milliseconds');
			return driver.sleep(action.actionArgs);
		default:
			print('yellow', '-> skip action ' + action.actionType);
	}
}

function findElement (action, driver) {
	var type = action.findType ? action.findType.toUpperCase() : null;
	var arg = action.findArgs;
	var index;

	if (arg) {
		var regResult = arg.match(/(.*)\[(\d)\]/);
		if (regResult) {
			arg = regResult[1];
			index = regResult[2];
		}
	}

	var functionName;

	switch(type) {
		case 'ID':
			functionName = isNaN(index) ? 'elementById' : 'elementsById';
			break;
		case 'NAME':
			functionName = isNaN(index) ? 'elementByName' : 'elementsByName';
			break;
		case 'CLASSNAME':
			functionName = isNaN(index) ? 'elementByClassName' : 'elementsByClassName';
			break;
		case 'CSSSELECTOR':
			functionName = isNaN(index) ? 'elementByCssSelector' : 'elementsByCssSelector';
			break;
		case 'LINKTEXT':
			functionName = isNaN(index) ? 'elementByLinkText' : 'elementsByLinkText';
			break;
		case 'PARTIALLINKTEXT':
			functionName = isNaN(index) ? 'elementByPartialLinkText' : 'elementsByPartialLinkText';
			break;
		case 'TAGNAME':
			functionName = isNaN(index) ? 'elementByTagName' : 'elementsByTagName';
			break;
		case 'XPATH':
			functionName = isNaN(index) ? 'elementByXPath' : 'elementsByXPath';
			break;
		case 'CSS':
			functionName = isNaN(index) ? 'elementByCss' : 'elementsByCss';
			break;
		case 'IOSUIAUTOMATION':
			functionName = isNaN(index) ? 'elementByIosUIAutomation' : 'elementsByIosUIAutomation';
			break;
		case 'ANDROIDUIAUTOMATOR':
			functionName = isNaN(index) ? 'elementByAndroidUIAutomator' : 'elementsByAndroidUIAutomator';
			break;
		case 'ACCESSIBILITYID':
			functionName = isNaN(index) ? 'elementByAccessibilityId' : 'elementsByAccessibilityId';
			break;
		default:
			print('yellow', '-> skip element find ');
			return;
	}

	print('yellow', '-> find ' + functionName + ': "' + arg + '"' + (isNaN(index) ? '' : (' position: ' + index + ' ')) + '...');
	return driver[functionName](arg)
		.then(function (element) {
			if (isNaN(index)) {
				return element;
			} else {
				if (index > 0 && index <= element.length) {
					return element[index - 1];
				} else {
					throw new Error('index ' + index + ' out of bounds of ' + element);
				}
			}
		});
}

function runAction (bundle) {
	return Q.Promise(function (resolve, reject) {
		var action = bundle.actions.splice(0, 1)[0];
		var driver = bundle.driver;

		driver.hideKeyboard({strategy: 'pressKey', key:'done'})
			.fin(function () {
				reporter.actionStart(action);

				driver.sleep(1000)
					.then(function () {
						return findElement(action, driver);
					})
					.then(function (element) {
						return performAction(action, element, driver);
					})
					.then(function () {
						reporter.actionEnd();
						resolve(bundle);
					})
					.catch(function (err) {
						reporter.actionEnd(err);
						reject(err);
					});
			});
	});
}

function runScript (bundle) {
	return Q.Promise(function (resolve, reject) {
		var script = bundle.scripts.splice(0, 1)[0];
		var driver = bundle.driver;

		print('yellow', '----------> ' + script.title + '  (' + (bundle.total - bundle.scripts.length) + '/' + bundle.total + ') <----------');
		reporter.scriptStart(script);

		driver
			.sleep(1000)
			.then(function () {
				return script.actions.map(function () {
						return runAction;
					}).reduce(Q.when, Q({
						driver: driver,
						actions: script.actions
					}));
			})
			.then(function () {
				reporter.scriptEnd();
				print('green', '----------------------------------------');
				print('green', ' ' + script.title + '  Success');
				print('green', '----------------------------------------');
			})
			.catch(function (err) {
				reporter.scriptEnd(err);
				print('red', '----------------------------------------');
				print('red', '-- ' + script.title + '  Error');
				print('red', err.stack);
				print('red', '----------------------------------------');
			})
			.fin(function () {
				driver.resetApp()
					.fin(function () {
						resolve(bundle);
					});
			})
			.done();
	});
}

module.exports = {
	run: function (driver, scripts, tags, platform, osVersion, installPack) {
		reporter.start(tags, platform, osVersion, installPack);

		return scripts.map(function () {
				return runScript;
			}).reduce(Q.when, Q({
				driver: driver,
				scripts: scripts,
				total: scripts.length
			})).then(function () {
				return reporter.end();
			});
	}
}

