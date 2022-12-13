#!/usr/bin/env node

const program = require('commander');
const async = require('async');

const pem = require('../lib/pem');
const session = require('../lib/session');

program
  	.name('umask')
 	.description('umask - set file mode creation mask')
	.argument('mode')
	.action((mode, cmd) => {
		try {
			if (!mode || mode.length > 3) {
				console.log('umask: Sorry');
				console.log(`Try umask 775, not 0775 (0 - special modes not allowed)`);
				return;
			}

			const octal = pem.translate(mode.split(''));

			if (octal === -1) {
				console.log('umask: Sorry');
				console.log(`Try umask 775, not 0775 (0 - special modes not allowed)`);
				return;
			}

			async.waterfall([
				(callback) => {
					session.get((err, s) => {
						if (err || s == 'EMPTY') {
							return callback('No active session');
						}

						if (s.toString() != pem.ROOT) {
							return callback(`${mode}: Permission denied`);
						}

						return callback(null, s);
					});
				},
				(sessionID, callback) => {
					pem.setDefault(octal, (err, _) => {
						if (err) {
							return callback(err);
						}

						callback(null);
					});
				},
			], (err) => {
				if (err) {
					console.log('umask:', err);
					return;
				}

				console.log('umask: OK');
			});
		} catch (error) {
			console.log(error);
		}
	});

program.parse(process.argv);
