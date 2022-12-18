#!/usr/bin/env node

const program = require('commander');
const async = require('async');

const dir = require('../lib/dir');
const file = require('../lib/file');
const pem = require('../lib/pem');
const usr = require('../lib/usr');
const grp = require('../lib/grp');
const common = require('../lib/common');

program
  	.name('chmod')
 	.description('chmod - change file mode bits')
	.argument('MODE[,MODE]')
	.argument('[FILE...]')
	.option('-R, --recursive', 'operate on files and directories recursively')
	.action(async (mode, paths, options, cmd) => {
        if (!mode) {
            return program.error('chmod: mode file ...', { exitCode: 1 });
        }

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
                        return callback(`${mode} ${paths}: Permission denied`);
                    }

                    return callback(null, sessionID);
                });
            },
			(sessionID, callback) => {
                usr.findWith(sessionID.toString(), (err, u) => {
					if (err) {
						return callback(err);
					}

					callback(null, sessionID, u);
				});
			},
			(sessionID, user, callback) => {
				common.pwd.get((err, p) => {
					if (err) {
						return callback(err);
					}

					callback(null, sessionID, user, p.toString().trim());
				});
			},
			(sessionID, user, cwd, callback) => {
                const pathMatrix = common.path.resolve(paths, cwd);
				callback(null, sessionID, user, cwd, pathMatrix);
			},
            (sessionID, user, cwd, pathMatrix, callback) => {
                // Each MODE is of the form '[ugoa]*([-+=]([rwxXst]*|[ugo]))+'.
                // TODO: ensure mode is number only
                let modeOctal = mode.split('');

                for (let i = modeOctal.length - 1; i >= 0; i--) {
                    modeOctal[i] = parseInt(modeOctal[i], 10);
                }

                callback(null, sessionID, user, cwd, pathMatrix, modeOctal);
            },
			(sessionID, user, cwd, pathMatrix, modeOctal, callback) => {
				async.each(pathMatrix, (path, callback) => {
					dir.exist(path.slice(0, path.length - 1), -1, (err, exist) => {
						if (err) {
							return callback(err);
						}

						if (!exist) {
							return callback(`${path.join('/')}: No such file or directory`);
						}

                        const lastPath = path[path.length - 1];

                        if (common.path.isDir(lastPath) && options.recursive) {
                            return dir.find(lastPath, (err, d) => {
                                if (err) {
                                    return callback(err);
                                }

                                if (!d) {
                                    return callback(`${path.join('/')}: No such file or directory`);
                                }

                                async.parallel([
                                    (done) => dir.children(d.directory_id, done),
                                    (done) => file.children(d.directory_id, done),
                                ], (err, [directories, files]) => {
                                    async.each([...directories, ...files], (c, next) => {
                                        pem.find(c.permission_id, (err, p) => {
                                            if (err) {
                                                return next(err);
                                            }

                                            const [u,g,o] = modeOctal;
                                            const permission = {
                                                ...p,
                                                p_user: u,
                                                p_group: g,
                                                p_other: o,
                                            };

                                            pem.change(c.permission_id, permission, (err, p) => {
                                                if (err) {
                                                    return next(err);
                                                }

                                                next(null);
                                            });
                                        });
                                    }, callback);
                                });
                            });
                        }

                        const parentDirectory = path[path.length - 2];
                        const [filename, _] = lastPath.split('.');

                        return file.parent(filename, parentDirectory, (err, f) => {
                            if (err) {
                                return callback(err);
                            }

                            if (!f || f.directory_name != parentDirectory) {
                                return callback(`${path.join('/')}: No such file or directory`);
                            }

                            pem.find(f.permission_id, (err, p) => {
                                if (err) {
                                    return callback(err);
                                }

                                const [u,g,o] = modeOctal;
                                const permission = {
                                    ...p,
                                    p_user: u,
                                    p_group: g,
                                    p_other: o,
                                };

                                pem.change(f.permission_id, permission, (err, p) => {
                                    if (err) {
                                        return callback(err);
                                    }

                                    callback(null);
                                });
                            });
                        });
					});
				}, callback);
			},
		], (err) => {
			if (err) {
                return program.error(`chmod: ${err}`, { exitCode: 1 });
			}

			console.log('chmod: OK');
		});
	});

program.parse(process.argv);
