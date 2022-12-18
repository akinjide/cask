#!/usr/bin/env node

const program = require('commander');
const async = require('async');

const usr = require('../lib/usr');
const grp = require('../lib/grp');
const common = require('../lib/common');
const crypto = require('../lib/crypto');
const pem = require('../lib/pem');

program
    .name('usermod')
    .description('usermod - modify a user account')
    .argument('LOGIN', '', (text) => text.toLowerCase())
    .option('-a, --append', 'add the user to the supplementary group(s). Use only with the -G option.')
    .option('-G, --groups GROUP1[,GROUP2,...[,GROUPN]]]', 'if the user is currently a member of a group which is not listed, the user will be removed from the group. Use with the -a option, which appends the user to the current supplementary group list.')
    .action(async (login, options, cmd) => {
        if (!options.groups.length) {
            return program.error('usermod: -G option required', { exitCode: 1 });
        }

        const gs = options.groups.split(',');

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
                        return callback(`${login}: Permission denied`);
                    }

                    return callback(null, sessionID);
                });
            },
            (sessionID, callback) => {
                usr.findWith(login, (err, u) => {
                    if (err) {
                        return callback(err);
                    }

                    if (!u) {
                        return callback(`${login}: No such user`);
                    }

                    callback(null, sessionID, u);
                });
            },
            (sessionID, user, callback) => {
                const gQ = [];

                grp.search(gs, user.id, gQ, (err, exist) => {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, sessionID, user, exist, gQ);
                });
            },
            (sessionID, user, groupExist, gQ, callback) => {
                if (!groupExist && options.append) {
                    return async.each(gQ, (g, callback) => grp.add(g, user.id, callback), (err) => {
                        if (err) {
                            return callback(err);
                        }

                        return callback(null, user, false, []);
                    });
                }

                if (!options.append) {
                    return grp.findAll(user.id, (err, g) => {
                        const removeQ = [];

                        if (err) {
                            return callback(err);
                        }

                        for (let i = g.length - 1; i >= 0; i--) {
                            if (!gs.includes(g[i].name)) {
                                removeQ.push(g[i].name);
                            }
                        }

                        return callback(null, user, (removeQ.length != 0), removeQ);
                    });
                }

                return callback(null, user, false, []);
            },
            (user, removeGroup, rQ, callback) => {
                if (removeGroup) {
                    return async.each(rQ, (g, callback) => grp.del(g, user.id, callback), (err) => {
                        if (err) {
                            return callback(err);
                        }

                        return callback(null);
                    });
                }

                callback(null);
            }
        ], (err) => {
            if (err) {
                return program.error(`usermod: ${err}`, { exitCode: 1 });
            }

            console.log('usermod: OK');
        });
    });

program.parse(process.argv);
