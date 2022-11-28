#!/usr/bin/env node

const program = require('commander');
const async = require('async');

const grp = require('../lib/grp');
const session = require('../lib/session');

program
  	.name('groupadd')
 	.description('groupadd - create a new group')
 	.argument('group')
 	.action(async (group, cmd) => {
		try {
			async.waterfall([
				(callback) => {
					session.get((err, s) => {
						if (err || s == 'EMPTY') {
							return callback('No active session');
						}

						return callback(null, s);
					});
				},
				(sessionID, callback) => {
					grp.find(group, sessionID.toString(), (err, g) => {
						if (err) {
							return callback(err);
						}

						if (g) {
							return callback(`${group}: Exist`);
						}

						callback(null, sessionID);
					});
				},
				(sessionID, callback) => {
					grp.new(group, sessionID.toString(), (err) => {
						if (err) {
							return callback(err);
						}

						callback(null);
					});
				}
			], (err) => {
				if (err) {
					console.log('groupadd:', err);
					return;
				}

				console.log('groupadd: OK');
			});
		} catch (error) {
			console.log(error);
		}
	});

program.parse(process.argv);
