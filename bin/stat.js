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
    .name('stat')
    .description('stat - display file or file system status')
    .argument('[FILE...]')
    .action(async (paths, { l: longFormat, inode, directory }, cmd) => {
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
                callback(null, pathMatrix);
            },
            (pathMatrix, callback) => {
                async.each(pathMatrix, (path, callback) => {
                    dir.exist(path.slice(0, path.length - 1), -1, (err, exist) => {
                        if (!exist) {
                            return callback(`${path.join('/')}: No such file or directory`);
                        }

                        const lastPath = path[path.length - 1];
                        const parentDirectory = path[path.length - 2];
                        const [filename, _] = lastPath.split('.');

                        return file.parent(filename, parentDirectory, (err, f) => {
                            if (err) {
                                return callback(err);
                            }

                            if (!f) {
                                return callback(`${path.join('/')}: No such file or directory`);
                            }

                            const inodeHash = `${crypto.hash(f.file_id.toString()).slice(0, 8)}`;
                            console.log(util.format('  File: %s', (f.type ? `${f.name}.${f.type}` : f.name)));
                            console.log(util.format('  Size: %s\t Blocks: %s\t I/O Block: %s\t regular file', f.size, 0, f.size * 8));
                            console.log(util.format('Device: %s\t Inode: %s\t Links: 1', '-', inodeHash));
                            console.log(util.format(
                                'Access: (0%s%s%s/-%s%s%s) \t Uid: ( %s/%s ) \t Gid: ( %s/%s )',
                                f.p_user, f.p_group, f.p_other, pem.toASCII(f.p_user), pem.toASCII(f.p_group), pem.toASCII(f.p_other),
                                f.user_id, f.username,
                                f.group_id, f.group_name,
                            ));
                            console.log(util.format('Access: %s', dayjs(f.last_modified).format('YYYY-MM-DD HH:mm:ss.SSS ZZ')));
                            console.log(util.format('Modify: %s', dayjs(f.last_modified).format('YYYY-MM-DD HH:mm:ss.SSS ZZ')));
                            console.log(util.format('Change: %s', dayjs(f.last_modified).format('YYYY-MM-DD HH:mm:ss.SSS ZZ')));
                        });
                    });
                }, callback);
            },
        ], (err) => {
            if (err) {
                return program.error(`stat: ${err}`, { exitCode: 1 });
            }
        });
    });

program.parse(process.argv);
