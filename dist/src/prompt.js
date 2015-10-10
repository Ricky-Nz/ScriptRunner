var Q = require('q'),
	prompt = require('prompt');

module.exports = function (what, validator) {
	return Q.Promise(function (resolve, reject) {
		var schema;
		switch(what) {
			case 'platform':
				schema = {
					name: what,
					description: 'Select target platform',
					type: 'number',
					default: 1,
					message: 'Please enter the platform index',
					required: true,
					conform: validator
				};
				break;
			case 'package':
				schema = {
					name: what,
					description: 'Select installation package',
					type: 'number',
					default: 1,
					message: 'Please enter the package index',
					required: true,
					conform: validator
				};
				break;
			case 'tag':
				schema = {
					name: what,
					description: 'Enter the script tag you want to run',
					type: 'string',
					message: 'Please enter a tag or muti-tag split by space',
					required: true,
					conform: validator
				};
				break;
			case 'login':
				schema = [{
					name: 'email',
					description: 'Login Email',
					type: 'string',
					message: 'Please enter email',
					required: true
				}, {
					name: 'password',
					description: 'Login Password',
					type: 'string',
					message: 'Please enter password',
					required: true,
					hidden: true
				}];
				break;
			case 'none-device':
				schema = {
					name: what,
					description: 'Press enter to continue',
					type: 'string'
				};
				break;
			case 'none-version':
				schema = {
					name: what,
					description: 'Press enter to continue',
					type: 'string'
				};
				break;
			default:
				reject(new Error('promptGet illegal praameter: ' + what));
		}

		prompt.start();
		prompt.get(schema, function (err, result) {
			err ? reject(err) : resolve(result);
		});
	});
}