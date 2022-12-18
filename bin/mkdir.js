#!/usr/bin/env node

const program = require('commander');
const async = require('async');

const usr = require('../lib/usr');
const grp = require('../lib/grp');
const file = require('../lib/file');
const dir = require('../lib/dir');
const pem = require('../lib/pem');
const common = require('../lib/common');

program
  	.name('mkdir')
 	.description('mkdir - make directories')
	.argument('[DIRECTORY...]')
	.action(async (paths, cmd) => {
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

                    return callback(null, sessionID, s);
                });
            },
			(sessionID, sudo, callback) => {
				usr.findWith(sessionID.toString(), (err, u) => {
					if (err) {
						return callback(err);
					}

					callback(null, sessionID, u, sudo);
				});
			},
			(sessionID, user, sudo, callback) => {
				common.pwd.get((err, p) => {
					if (err) {
						return callback(err);
					}

					callback(null, sessionID, user, p.toString().trim(), sudo);
				});
			},
			(sessionID, user, cwd, sudo, callback) => {
				const pathMatrix = common.path.resolve(paths, cwd);
				callback(null, sessionID, user, cwd, pathMatrix, sudo);
			},
			(sessionID, user, cwd, pathMatrix, sudo, callback) => {
				const directories = [];

				async.each(pathMatrix, (path, callback) => {
					dir.exist(path, -1, (err, exist) => {
						if (exist) {
							return callback(`${path.join('/')}: File exists`);
						}

						dir.find(path[path.length - 2], (err, d) => {
							if (err) {
								return callback(err);
							}

                            const { p_other, p_user, p_group, owner_id, group_id } = d;
                            const canWrite = pem.canWrite(user.id, user.user_groups, { p_other, p_user, p_group, owner_id, group_id });

                            if (!canWrite) {
                            	if (sudo.toString() != pem.SUDOERS) {
	                                return callback(`cannot create directory ${path.join('/')}: Permission denied`);
	                            }
                            }

							dir.new(path[path.length - 1], d.directory_id, (err, d) => {
								if (err) {
									return callback(err);
								}

								directories.push(d);
								return callback(null);
							});
						});
					});
				}, (err) => {
					if (err) {
						return callback(err);
					}

					callback(null, sessionID, user, directories);
				});
			},
			(sessionID, user, directories, callback) => {
				grp.findWithUser(user.username, user.id, (err, g) => {
					if (err) {
						return callback(err);
					}

					return callback(null, sessionID, user, directories, g);
				});
			},
			(sessionID, user, directories, group, callback) => {
				pem.default.get((err, p) => {
					if (err) {
						return callback(err);
					}

					callback(null, sessionID, user, directories, group, p);
				});
			},
			(sessionID, user, directories, group, defaultPem, callback) => {
				async.each(directories, (directory, callback) => {
					pem.new(user.id, group.id, defaultPem, null, directory.id, callback);
				}, callback);
			}
		], (err) => {
			if (err) {
				return program.error(`mkdir: ${err}`, { exitCode: 1 });
			}

			console.log('mkdir: Ok');
		});
	});

program.parse(process.argv);
