#!/usr/bin/env node

const program = require('commander');
const async = require('async');

const grp = require('../lib/grp');
const usr = require('../lib/usr');
const common = require('../lib/common');
const dir = require('../lib/dir');
const file = require('../lib/file');
const pem = require('../lib/pem');

program
  	.name('rm')
 	.description('rm - remove files or directories')
	.argument('[FILE...]')
	.option('-f, --force', 'ignore nonexistent files, never prompt')
	.option('-r, --recursive', 'remove directories and their contents recursively')
 	.action(async (paths, options, cmd) => {
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
				callback(null, pathMatrix, user, sudo);
			},
			(pathMatrix, user, sudo, callback) => {
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

                                const { p_other, p_user, p_group, owner_id, group_id } = d;
                                const canWrite = pem.canWrite(user.id, user.user_groups, { p_other, p_user, p_group, owner_id, group_id });

                                if (!canWrite) {
	                            	if (sudo.toString() != pem.SUDOERS) {
	                                    return callback(`cannont remove ${path.join('/')}: Permission denied`);
	                                }
                                }

                                async.parallel([
                                    (done) => dir.children(d.directory_id, done),
                                    (done) => file.children(d.directory_id, done),
                                ], (err, [directories, files]) => {
                                    async.each([...directories, ...files], (c, next) => {
                                    	if (c.file_id) {
											return async.parallel([
												(callback) => {
													file.del(c.file_id, callback);
												},
												(callback) => {
													pem.del(c.permission_id, callback);
												},
											], next);
                                    	}

										async.parallel([
											(callback) => {
												dir.del(c.directory_id, callback);
											},
											(callback) => {
												pem.del(c.permission_id, callback);
											},
										], next);
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

                            const { p_other, p_user, p_group, owner_id, group_id } = f;
                            const canWrite = pem.canWrite(user.id, user.user_groups, { p_other, p_user, p_group, owner_id, group_id });

                            if (!canWrite) {
                            	if (sudo.toString() != pem.SUDOERS) {
                                    return callback(`cannont remove ${path.join('/')}: Permission denied`);
                                }
                            }

							async.parallel([
								(callback) => {
									file.del(f.file_id, callback);
								},
								(callback) => {
									pem.del(f.permission_id, callback);
								},
							], callback);
                        });
					});
				}, callback);
			},
		], (err) => {
			if (err) {
				return program.error(`rm: ${err}`, { exitCode: 1 });
			}
		});
	});

program.parse(process.argv);
