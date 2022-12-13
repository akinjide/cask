#!/usr/bin/env node

const util = require('node:util');
const program = require('commander');
const inquirer = require('inquirer');
const dayjs = require('dayjs');
const async = require('async');
const kuler = require('kuler');

const dir = require('../lib/dir');
const file = require('../lib/file');
const pem = require('../lib/pem');
const usr = require('../lib/usr');
const grp = require('../lib/grp');
const common = require('../lib/common');

program
  	.name('chown')
 	.description('chown - change file owner and group')
	.argument('[OWNER][:[GROUP]]')
	.argument('[FILE...]')
	.option('-R, --recursive', 'operate on files and directories recursively')
	.action(async (stmt, directoriesPath, { recursive }, cmd) => {
		const [ownerUsername, ownerGroup] = stmt.split(':');

		if ((!ownerUsername || !ownerGroup)) {
			console.log('chown: No id');
			return;
		}

		async.waterfall([
			(callback) => {
				common.session.get((err, s) => {
					if (err || s == 'EMPTY') {
						return callback('No active session');
					}

					return callback(null, s);
				});
			},
			(sessionID, callback) => {
				if (ownerUsername) {
					return usr.findWith(ownerUsername, (err, u) => {
						if (err) {
							return callback(err);
						}

						callback(null, sessionID, u);
					});
				}

				callback(null, sessionID, null);
			},
			(sessionID, user, callback) => {
				if (ownerGroup) {
					return grp.find(ownerGroup, (err, g) => {
						if (err) {
							return callback(err);
						}

						callback(null, sessionID, user, g);
					});
				}

				callback(null, sessionID, user, null);
			},
			(sessionID, user, group, callback) => {
				common.pwd.get((err, p) => {
					if (err) {
						return callback(err);
					}

					callback(null, sessionID, user, group, p.toString().trim());
				});
			},
			(sessionID, user, group, cwd, callback) => {
				const directoryPathMatrix = [];

				if (!directoriesPath || directoriesPath.length == 0) {
					directoriesPath = [cwd];
				}

				for (let i = directoriesPath.length - 1; i >= 0; i--) {
					directoryPathMatrix[i] = [];

					let directoryPath = directoriesPath[i].split('/');

					if (directoryPath.length == 1) {
						const base = cwd.split('/');
						base.push(...directoryPath);
						directoryPath = base;
					}

					if (directoryPath[0] == '') {
						directoryPath = directoryPath.slice(1);
					}

					for (let j = directoryPath.length - 1; j >= 0; j--) {
						directoryPathMatrix[i][j] = directoryPath[j];
					}
				}

				callback(null, sessionID, user, group, cwd, directoryPathMatrix);
			},
			(sessionID, user, group, cwd, directoryPathMatrix, callback) => {
				async.each(directoryPathMatrix, (directoryPath, callback) => {
					dir.exist(directoryPath.slice(0, directoryPath.length - 1), (err, d) => {
						if (err) {
							return callback(err);
						}

						if (!d) {
							return callback(`${directoryPath.join('/')}: No such file or directory`);
						}

						const [filename, _] = directoryPath[directoryPath.length - 1].split('.');

						return file.findWith(filename, (err, f) => {
							if (err) {
								return callback(err);
							}

							if (!f) {
								return callback(`${directoryPath.join('/')}: No such file or directory`);
							}

							pem.find(f.permission_id, (err, p) => {
								if (err) {
									return callback(err);
								}

								let permission = { ...p };

								if (user) {
									permission = { ...permission, owner_id: user.id };
								}

								if (group) {
									permission = { ...permission, group_id: group.id };
								}

								pem.change(f.permission_id, permission, (err, p) => {
									if (err) {
										return callback(err);
									}

									callback(null);
								});
							});
						});
					});
				}, (err) => {
					callback(err);
				});
			},
		], (err, results) => {
			if (err) {
				console.log('chown:', err);
				return;
			}

			console.log('chown: OK');
		});
	});

program.parse(process.argv);
