var Q = require('q'),
	logger = require('./logger');

function loopNameArray (driver, names, index, callback) {
	logger('yellow', '--查找> ' + names[index]);

	if (index >= names.length) {
		return callback();
	}

	driver.setImplicitWaitTimeout(2000)
		.then(function () {
			return driver.elementByName(names[index]);
		})
		.then(function (element) {
			if (element) {
				callback(element);
			} else {
				loopNameArray(driver, names, index + 1, callback);
			}
		})
		.catch(function (error) {
			loopNameArray(driver, names, index + 1, callback);
		});
}

function findByName (driver, name, retry, timeout, callback) {
	if (retry <= 0) {
		return callback();
	}

	driver.setImplicitWaitTimeout(timeout)
		.then(function () {
			return driver.elementByName(name);
		})
		.then(function (element) {
			callback(element);
		})
		.catch(function (err) {
			driver.flick(0, -500)
				.fin(function () {
					findByName(driver, name, retry - 1, timeout, callback);
				});
		});
}

module.exports = {
	findElementByNameArray: function (driver, names) {
		var defered = Q.defer();

		loopNameArray(driver, names, 0 ,function (element) {
			if (element) {
				defered.resolve(element);
			} else {
				defered.reject(new Error('Element not found: ' + names));
			}
		});

		return defered.promise;
	},
	quickSelectElement: function (driver, name) {
		var defered = Q.defer();

		var firstLetter = name[0];
		driver.setImplicitWaitTimeout(20000)
			.then(function () {
				return driver.elementByName(firstLetter);
			})
			.then(function (element) {
				element.click()
					.then(function () {
						findByName(driver, name, 6, 2000, function (element) {
							if (element) {
								defered.resolve(element);
							} else {
								defered.reject(new Error('quick select element not found: ' + name));
							}
						});
					})
					.catch(function (err) {
						defered.reject(err);
					});
			})
			.catch(function (err) {
				defered.reject(new Error('quick select index not found for: ' + firstLetter));
			});

		return defered.promise;
	},
	findElementByName: function (driver, name, retry, timeout) {
		var defered = Q.defer();

		findByName(driver, name, retry, timeout, function (element) {
			if (element) {
				defered.resolve(element);
			} else {
				defered.reject(new Error('element not find: ' + name));
			}
		});

		return defered.promise;
	}
};


