#!/usr/bin/env node

const util = require('node:util');
const program = require('commander');
const dayjs = require('dayjs');
const async = require('async');
const kuler = require('kuler');

const dir = require('../lib/dir');
const file = require('../lib/file');
const pem = require('../lib/pem');
const common = require('../lib/common');
const usr = require('../lib/usr');
const crypto = require('../lib/crypto');

program
    .name('ls')
    .description('ls - list directory contents')
    .argument('[FILE...]')
    .option('-l', 'use a long listing format')
    .option('-i, --inode', 'print the index number of each file')
    .option('-d, --directory', 'list directory entries instead of contents, and do not dereference symbolic links')
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
                    dir.exist(path, -1, (err, exist) => {
                        if (!exist) {
                            return callback(`${path.join('/')}: No such file or directory`);
                        }

                        dir.find(path[path.length - 1], (err, d) => {
                            const { p_other, p_user, p_group, owner_id, group_id } = d;
                            const canRead = pem.canRead(user.id, user.user_groups, { p_other, p_user, p_group, owner_id, group_id });

                            if (!canRead) {
                                if (sudo.toString() != pem.SUDOERS) {
                                    return callback(`${path.join('/')}: Permission denied`);
                                }
                            }

                            async.parallel([
                                (callback) => {
                                    return file.children(d.directory_id, callback);
                                },
                                (callback) => {
                                    return dir.children(d.directory_id, callback);
                                },
                            ], (err, [files, directories]) => {
                                if (err) {
                                    return callback(err);
                                }

                                const total = (files.length + directories.length);
                                let fileCounter = 0;
                                let dirCounter = 0;
                                let output = '';

                                if (options.l) {
                                    if (pathMatrix.length > 1) {
                                        console.log(`${path.join('/')}:`);
                                    }

                                    if (total) {
                                        console.log(`total ${total}`);
                                    }
                                }

                                while (true) {
                                    if (directories[dirCounter]) {
                                        const d = directories[dirCounter++];
                                        let inodeHash = '';

                                        if (options.inode) {
                                            inodeHash = `${crypto.hash(d.directory_id.toString()).slice(0, 8)} `;
                                        }

                                        if (options.l) {
                                            console.log(util.format(
                                                `%s%s%s%s%s  %s %s %s\t%s %s ${kuler('%s', '#0000FF')}`,
                                                inodeHash,
                                                d.type,
                                                pem.toASCII(d.p_user),
                                                pem.toASCII(d.p_group),
                                                pem.toASCII(d.p_other),
                                                '1',
                                                d.username,
                                                d.group_name.padStart(8),
                                                d.size.toString().padStart(4),
                                                dayjs(d.last_modified).format('MMM  DD HH:mm'),
                                                d.name,
                                            ));
                                        } else {
                                            output += util.format(`%s${kuler('%s', '#0000FF')}\t`, inodeHash, d.name);
                                        }

                                        continue;
                                    }

                                    if (files[fileCounter]) {
                                        const f = files[fileCounter++];
                                        let inodeHash = '';

                                        if (options.inode) {
                                            inodeHash = `${crypto.hash(f.file_id.toString()).slice(0, 8)} `;
                                        }

                                        if (options.l) {
                                            console.log(util.format(
                                                '%s%s%s%s%s  %s %s %s\t%s %s %s',
                                                inodeHash,
                                                '-',
                                                pem.toASCII(f.p_user),
                                                pem.toASCII(f.p_group),
                                                pem.toASCII(f.p_other),
                                                '1',
                                                f.username,
                                                f.group_name.padStart(8),
                                                f.size.toString().padStart(4),
                                                dayjs(f.last_modified).format('MMM  DD HH:mm'),
                                                (f.type ? `${f.name}.${f.type}` : f.name),
                                            ));
                                        } else {
                                            output += util.format('%s%s\t', inodeHash, (f.type ? `${f.name}.${f.type}` : f.name));
                                        }

                                        continue;
                                    }

                                    if (!directories[dirCounter] && !files[fileCounter]) {
                                        if (!options.l) {
                                            console.log(output);
                                        }

                                        break;
                                    }
                                }

                                callback(null);
                            });
                        });
                    });
                }, callback);
            },
        ], (err) => {
            if (err) {
                return program.error(`ls: ${err}`, { exitCode: 1 });
            }
        });
    });

program.parse(process.argv);
