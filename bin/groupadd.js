#!/usr/bin/env node

const program = require('commander');
const async = require('async');

const grp = require('../lib/grp');
const common = require('../lib/common');
const pem = require('../lib/pem');

program
  	.name('groupadd')
 	.description('groupadd - create a new group')
 	.argument('group')
 	.action(async (group, cmd) => {
		async.waterfall([
			(callback) => {
				common.session.get((err, s) => {
					if (err || s == 'ERR_EMPTY') {
						return callback('No active session');
					}

					return callback(null, s);
				});
			},
            (sessionID, callback) => {
                common.sudo.get((err, s) => {
                    if (err || err == 'ERR_EMPTY') {
                        return callback('No active sudo');
                    }

                    if (s.toString() != pem.SUDOERS) {
                        return callback(`${group}: Permission denied`);
                    }

                    return callback(null, sessionID);
                });
            },
			(sessionID, callback) => {
				grp.findWithUser(group, sessionID.toString(), (err, g) => {
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
                return program.error(`groupadd: ${err}`, { exitCode: 1 });
			}

			console.log('groupadd: OK');
		});
	});

program.parse(process.argv);
