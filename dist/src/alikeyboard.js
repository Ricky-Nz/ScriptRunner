var Q = require('q'),
	wd = require('wd'),
	logger = require('./logger');

var SCREEN_RATIO_PADDING = 2,
	SCREEN_RATIO_WIDTH = 9,
	SCREEN_RATIO_HEIGHT = 12;

function getPasswordKeyboardLocation (screenWidth, screenHeight) {
	var cellW = screenWidth / 10;
	var cellH = cellW * SCREEN_RATIO_HEIGHT / SCREEN_RATIO_WIDTH;
	var padding = cellW * SCREEN_RATIO_PADDING / SCREEN_RATIO_WIDTH;

	var numBtnW = screenWidth / 3;
	var numBtnH = numBtnW * 2 / 5;

	return {
		'1': {
			x: 0.5 * numBtnW,
			y: screenHeight - (3.5 * numBtnH)
		},
		'2': {
			x: 1.5 * numBtnW,
			y: screenHeight - (3.5 * numBtnH)
		},
		'3': {
			x: 2.5 * numBtnW,
			y: screenHeight - (3.5 * numBtnH)
		},
		'4': {
			x: 0.5 * numBtnW,
			y: screenHeight - (2.5 * numBtnH)
		},
		'5': {
			x: 1.5 * numBtnW,
			y: screenHeight - (2.5 * numBtnH)
		},
		'6': {
			x: 2.5 * numBtnW,
			y: screenHeight - (2.5 * numBtnH)
		},
		'7': {
			x: 0.5 * numBtnW,
			y: screenHeight - (1.5 * numBtnH)
		},
		'8': {
			x: 1.5 * numBtnW,
			y: screenHeight - (1.5 * numBtnH)
		},
		'9': {
			x: 2.5 * numBtnW,
			y: screenHeight - (1.5 * numBtnH)
		},
		'del': {
			x: 0.5 * numBtnW,
			y: screenHeight - (0.5 * numBtnH)
		},
		'0': {
			x: 1.5 * numBtnW,
			y: screenHeight - (0.5 * numBtnH)
		},
		'ok': {
			x: 2.5 * numBtnW,
			y: screenHeight - (0.5 * numBtnH)
		}
	};
}

function getCommonKeyboardLocation (screenWidth, screenHeight) {
	var cellW = screenWidth / 10;
	var cellH = cellW * SCREEN_RATIO_HEIGHT / SCREEN_RATIO_WIDTH;
	var padding = cellW * SCREEN_RATIO_PADDING / SCREEN_RATIO_WIDTH;

	var numBtnW = screenWidth / 3;
	var numBtnH = numBtnW * 2 / 5;
	var keyboard = {};

	for (var i = 1; i <= 10; i++) {
		keyboard['l1c' + i] = {
			x: (i - 0.5) * cellW,
			y: screenHeight - 3 * (cellH + padding) - cellH / 2 - padding
		};
	}

	for (var i = 1; i <= 9; i++) {
		keyboard['l2c' + i] = {
			x: i * cellW,
			y: screenHeight - 2 * (cellH + padding) - cellH / 2 - padding
		};
	}

	for (var i = 1; i <= 7; i++) {
		keyboard['l3c' + i] = {
			x: (i + 1) * cellW,
			y: screenHeight - 1 * (cellH + padding) - cellH / 2 - padding
		};
	}

	keyboard['toggle'] = {
		x: cellW,
		y: screenHeight - cellH / 2
	};

	return keyboard;
}

function getLetterKeyboardLocation (screenWidth, screenHeight) {
	var keyboard = getCommonKeyboardLocation(screenWidth, screenHeight);

	return {
		'q': keyboard.l1c1,
		'w': keyboard.l1c2,
		'e': keyboard.l1c3,
		'r': keyboard.l1c4,
		't': keyboard.l1c5,
		'y': keyboard.l1c6,
		'u': keyboard.l1c7,
		'i': keyboard.l1c8,
		'o': keyboard.l1c9,
		'p': keyboard.l1c10,
		'a': keyboard.l2c1,
		's': keyboard.l2c2,
		'd': keyboard.l2c3,
		'f': keyboard.l2c4,
		'g': keyboard.l2c5,
		'h': keyboard.l2c6,
		'j': keyboard.l2c7,
		'k': keyboard.l2c8,
		'l': keyboard.l2c9,
		'z': keyboard.l3c1,
		'x': keyboard.l3c2,
		'c': keyboard.l3c3,
		'v': keyboard.l3c4,
		'b': keyboard.l3c5,
		'n': keyboard.l3c6,
		'm': keyboard.l3c7,
		'toggle': keyboard.toggle
	};
}

function getNumberKeyboardLocation (screenWidth, screenHeight) {
	var keyboard = getCommonKeyboardLocation(screenWidth, screenHeight);

	return {
		'1': keyboard.l1c1,
		'2': keyboard.l1c2,
		'3': keyboard.l1c3,
		'4': keyboard.l1c4,
		'5': keyboard.l1c5,
		'6': keyboard.l1c6,
		'7': keyboard.l1c7,
		'8': keyboard.l1c8,
		'9': keyboard.l1c9,
		'0': keyboard.l1c10,
		'~': keyboard.l2c1,
		'!': keyboard.l2c2,
		'@': keyboard.l2c3,
		'#': keyboard.l2c4,
		'%': keyboard.l2c5,
		"'": keyboard.l2c6,
		'&': keyboard.l2c7,
		'*': keyboard.l2c8,
		'?': keyboard.l2c9,
		'(': keyboard.l3c1,
		')': keyboard.l3c2,
		'-': keyboard.l3c3,
		'_': keyboard.l3c4,
		':': keyboard.l3c5,
		';': keyboard.l3c6,
		'/': keyboard.l3c7,
		'toggle': keyboard.toggle
	};
}

function inputPassword (text, index, driver, keyboard, callback) {
	if (index >= text.length) {
		return callback();
	}

	var input = text[index];
	var location = keyboard[input];
	if (!location) {
		return callback(new Error('letter not found on password keyboard: ' + input));
	}

	logger('yellow', '--输入> ' + input);

	driver.sleep(500)
		.then(function () {
		    var touchAction = new wd.TouchAction();
		    touchAction.press(location).moveTo(1, 1).release();

			return driver.performTouchAction(touchAction);
		})
		.then(function () {
			inputPassword (text, index + 1, driver, keyboard, callback);
		})
		.catch(function (err) {
			callback(err);
		});
}

function inputText (text, index, driver, state, callback) {
	if (index >= text.length) {
		return callback();
	}

	var input = text[index];

	var location = state[state.flag][input];
	if (!location) {
		if(state[!state.flag][input]) {
			logger('yellow', '--切换键盘>');
		    driver.sleep(500)
		    	.then(function () {
				    var touchAction = new wd.TouchAction();
				    touchAction.press(state[state.flag]['toggle']).release();

				    return driver.performTouchAction(touchAction);
		    	})
		    	.then(function () {
		    		state.flag = !state.flag;
		    		inputText(text, index, driver, state, callback);
		    	})
		    	.catch(function (err) {
		    		callback(err);
		    	});
		} else {
			return callback(new Error('letter not found on password keyboard: ' + input));
		}
	} else {
		logger('yellow', '--输入> ' + input);

		driver.sleep(500)
			.then (function () {
				var touchAction = new wd.TouchAction();
				touchAction.press(location).release();

				return driver.performTouchAction(touchAction);
			})
			.then(function () {
				inputText(text, index + 1, driver, state, callback);
			})
			.catch(function (err) {
				callback(err);
			});
	}
}

module.exports = {
	input: function (text, isPasswordInput, driver) {
		var defered = Q.defer();

		driver.sleep(3000)
			.then(function () {
				return driver.getWindowSize();
			})
			.then(function (window) {
				var callback = function (err) {
					if (err) {
						defered.reject(err);
					} else {
						defered.resolve();
					}
				};

				if (isPasswordInput) {
					var keyboard = getPasswordKeyboardLocation(window.width, window.height);
					inputPassword(text, 0, driver, keyboard, callback);
				} else {
					var letterKeyboard = getLetterKeyboardLocation(window.width, window.height);
					var numberKeyboard = getNumberKeyboardLocation(window.width, window.height);

					inputText(text, 0, driver, {
						true: letterKeyboard,
						false: numberKeyboard,
						flag: true
					}, callback);
				}
			})
			.catch(function (error) {
				defered.reject(error);
			});

		return defered.promise;
	}
}





