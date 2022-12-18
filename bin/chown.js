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
    .name('chown')
    .description('chown - change file owner and group')
    .argument('[OWNER][:[GROUP]]')
    .argument('[FILE...]')
    .option('-R, --recursive', 'operate on files and directories recursively')
    .action(async (stmt, paths, options, cmd) => {
        const [ownerUsername, ownerGroup] = stmt.split(':');

        if (!(ownerUsername || ownerGroup)) {
            return program.error('chown: owner:group file ...', { exitCode: 1 });
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
                        return callback(`${stmt} ${paths}: Permission denied`);
                    }

                    return callback(null, sessionID);
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
                const pathMatrix = common.path.resolve(paths, cwd);
                callback(null, sessionID, user, group, cwd, pathMatrix);
            },
            (sessionID, user, group, cwd, pathMatrix, callback) => {
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

                                            let permission = { ...p };

                                            if (user) {
                                                permission = { ...permission, owner_id: user.id };
                                            }

                                            if (group) {
                                                permission = { ...permission, group_id: group.id };
                                            }

                                            pem.change(c.permission_id, permission, (err, p) => {
                                                if (err) {
                                                    return callback(err);
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
                }, callback);
            },
        ], (err) => {
            if (err) {
                return program.error(`chown: ${err}`, { exitCode: 1 });
            }

            console.log('chown: OK');
        });
    });

program.parse(process.argv);
