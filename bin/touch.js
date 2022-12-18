#!/usr/bin/env node

const program = require('commander');
const async = require('async');

const usr = require('../lib/usr');
const grp = require('../lib/grp');
const common = require('../lib/common');
const file = require('../lib/file');
const dir = require('../lib/dir');
const pem = require('../lib/pem');

program
    .name('touch')
    .description('touch - create a new empty file(s) or change file timestamps')
    .argument('[FILE...]')
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

                    return callback(null, sessionID, u, sudo);
                });
            },
            (sessionID, user, sudo, callback) => {
                grp.findWithUser(user.username, user.id, (err, g) => {
                    if (err) {
                        return callback(err);
                    }

                    return callback(null, sessionID, user, g, sudo);
                });
            },
            (sessionID, user, group, sudo, callback) => {
                pem.default.get((err, p) => {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, sessionID, user, group, p, sudo);
                });
            },
            (sessionID, user, group, defaultPem, sudo, callback) => {
                common.pwd.get((err, p) => {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, sessionID, user, group, defaultPem, p.toString().trim(), sudo);
                });
            },
            (sessionID, user, group, defaultPem, cwd, sudo, callback) => {
                const pathMatrix = common.path.resolve(paths, cwd);
                callback(null, sessionID, user, group, defaultPem, pathMatrix, sudo);
            },
            (sessionID, user, group, defaultPem, pathMatrix, sudo, callback) => {
                async.each(pathMatrix, (path, callback) => {
                    dir.exist(path.slice(0, path.length - 1), -1, (err, exist) => {
                        if (err) {
                            return callback(err);
                        }

                        if (!exist) {
                            return callback(`${path.join('/')}: No such file or directory`);
                        }

                        const lastPath = path[path.length - 1];
                        const parentDirectory = path[path.length - 2];
                        const [filename, filetype] = lastPath.split('.');

                        return file.parent(filename, parentDirectory, (err, f) => {
                            if (err) {
                                return callback(err);
                            }

                            if (!f) {
                                return dir.find(parentDirectory, (err, d) => {
                                    if (err) {
                                        return callback(err);
                                    }

                                    let directoryID = user.home_directory_id;

                                    if (d) {
                                        directoryID = d.directory_id;
                                        const { p_other, p_user, p_group, owner_id, group_id } = d;
                                        const canWrite = pem.canWrite(user.id, user.user_groups, { p_other, p_user, p_group, owner_id, group_id });

                                        if (!canWrite) {
                                            if (sudo.toString() != pem.SUDOERS) {
                                                return callback(`cannot touch ${path.join('/')}: Permission denied`);
                                            }
                                        }
                                    }

                                    return file.new(filename, 0, filetype, '', Date.now(), directoryID, (err, f) => {
                                        if (err) {
                                            return callback(err);
                                        }

                                        return pem.new(user.id, group.id, defaultPem, f.id, null, (err) => {
                                            if (err) {
                                                return callback(err);
                                            }

                                            return dir.upsertBytes(user.home_directory_id, file.size, callback);
                                        });
                                    });
                                });
                            }

                            const { p_other, p_user, p_group, owner_id, group_id } = f;
                            const canExec = pem.canExec(user.id, user.user_groups, { p_other, p_user, p_group, owner_id, group_id });

                            if (!canExec) {
                                if (sudo.toString() != pem.SUDOERS) {
                                    return callback(`cannot touch ${path.join('/')}: Permission denied`);
                                }
                            }

                            return file.change(f.file_id, f, callback);
                        });
                    });
                }, callback);
            },
        ], (err) => {
            if (err) {
                return program.error(`touch: ${err}`, { exitCode: 1 });
            }

            console.log('touch: OK');
        });
    });

program.parse(process.argv);
