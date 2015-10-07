var fs = require('fs');
var path = require('path');
var reportPath = path.join(__dirname, '..', 'report.json');
var report;

module.exports = {
	start: function (tags, platform, osVersion, installPack) {
		report = {
			startDate: new Date(),
			tags: tags.join(','),
			platform: platform,
			platformVersion: osVersion,
			packageName: installPack.title,
			packageDate: installPack.date,
			scripts: []
		};
	},
	scriptStart: function (script) {
		report.scripts.push({
			title: script.title,
			startDate: new Date()
		});
	},
	actionStart: function (action) {
		var script = report.scripts[report.scripts.length - 1];
		if (!script.actions) {
			script.actions = [];
		}
		
		script.actions.push({
			title: action.actionType + (action.actionArgs ? (' ' + action.actionArgs + ' ') : '') + (action.findType ? (' to element find by ' + action.findType + ' ' + action.findArgs) : ''),
			startDate: new Date()
		});
	},
	actionEnd: function (err) {
		var script = report.scripts[report.scripts.length - 1];
		action = script.actions[script.actions.length - 1];
		action.endDate = new Date();
		action.err = err ? err.stack : null;
	},
	scriptEnd: function (err) {
		var script = report.scripts[report.scripts.length - 1];
		script.err = err ? err.stack : null;
		script.endDate = new Date();
	},
	end: function () {
		report.endDate = new Date();
		return report;
	}
}