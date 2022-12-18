#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');
const async = require('async');

const dir = require('../lib/dir');
const file = require('../lib/file');
const pem = require('../lib/pem');
const common = require('../lib/common');
const usr = require('../lib/usr');
const grp = require('../lib/grp');

program
    .name('editor')
    .description('editor - text editor')
    .argument('FILE')
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
                grp.findWithUser(user.username, user.id, (err, g) => {
                    if (err) {
                        return callback(err);
                    }

                    return callback(null, sessionID, user, cwd, g, sudo);
                });
            },
            (sessionID, user, cwd, group, sudo, callback) => {
                pem.default.get((err, p) => {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, sessionID, user, cwd, group, p, sudo);
                });
            },
            (sessionID, user, cwd, group, defaultPem, sudo, callback) => {
                const pathMatrix = common.path.resolve([paths], cwd);
                callback(null, sessionID, user, cwd, group, defaultPem, pathMatrix, sudo);
            },
            (sessionID, user, cwd, group, defaultPem, pathMatrix, sudo, callback) => {
                const filePath = pathMatrix[0];

                dir.exist(filePath.slice(0, filePath.length - 1), -1, (err, exist) => {
                    if (!exist) {
                        return callback(`${filePath.join('/')}: No such file`);
                    }

                    (async () => {
                        const info = await inquirer.prompt([
                            {
                                type: 'editor',
                                name: 'editor',
                                message: ' ',
                                prefix: '',
                                waitUserInput: false,
                            }
                        ]);

                        const parentDirectory = filePath[filePath.length - 2];
                        const [filename, filetype] = filePath[filePath.length - 1].split('.');
                        const c = {
                            content: info.editor,
                            size: info.editor.length * file.size,
                        };

                        return file.parent(filename, parentDirectory, (err, f) => {
                            if (err) {
                                return callback(err);
                            }

                            if (!f || f.directory_name != parentDirectory) {
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
                                                return callback(`${filePath.join('/')}: Permission denied`);
                                            }
                                        }
                                    }

                                    return callback(null, sessionID, user, cwd, group, defaultPem, c, null, false, filename, filetype, directoryID);
                                });
                            }

                            const { p_other, p_user, p_group, owner_id, group_id } = f;
                            const canWrite = pem.canWrite(user.id, user.user_groups, { p_other, p_user, p_group, owner_id, group_id });

                            if (!canWrite) {
                                if (sudo.toString() != pem.SUDOERS) {
                                    return callback(`${filePath.join('/')}: Permission denied`);
                                }
                            }

                            return file.change(f.file_id, { ...f, ...c }, (err, _) => {
                                if (err) {
                                    return callback(err);
                                }

                                return callback(null, sessionID, user, cwd, group, defaultPem, c, f, true, filename, filetype, null);
                            });
                        });
                    })();
                });
            },
            (sessionID, user, cwd, group, defaultPem, c, f, fileExist, fileName, fileType, directoryID, callback) => {
                if (fileExist) {
                    return callback(null, user, c, f);
                }

                file.new(fileName, c.size, fileType, c.content, Date.now(), directoryID, (err, f) => {
                    if (err) {
                        return callback(err);
                    }

                    return pem.new(user.id, group.id, defaultPem, f.id, null, (err) => {
                        if (err) {
                            return callback(err);
                        }

                        callback(null, user, c, f);
                    });
                });
            },
            (user, c, f, callback) => {
                return dir.upsertBytes(f.directory_id, c.size, (err, _) => {
                    if (err) {
                        return callback(err);
                    }

                    callback(null);
                });
            }
        ], (err, results) => {
            if (err) {
                return program.error(`editor: ${err}`, { exitCode: 1 });
            }
        });
    });

program.parse(process.argv);
