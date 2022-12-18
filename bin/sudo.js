#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');
const async = require('async');

const grp = require('../lib/grp');
const usr = require('../lib/usr');
const common = require('../lib/common');
const crypto = require('../lib/crypto');
const pem = require('../lib/pem');

program
    .name('sudo')
    .description('sudo - elevate priviledge')
    .action(async (cmd) => {
        try {
            const { passwd } = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'passwd',
                    message: 'Password',
                    mask: true,
                }
            ]);

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

                        if (err || !crypto.compare(u.password, passwd)) {
                            return callback('Sorry');
                        }

                        callback(null, u);
                    });
                },
                (user, callback) => {
                    usr.sudoer(user.id, (err, u) => {
                        if (err) {
                            return callback(err);
                        }

                        if (u && u.group_id) {
                            return common.sudo.set(u.group_id, callback);
                        }

                        return common.sudo.set('-1', callback);
                    });
                }
            ], (err) => {
                if (err) {
                    return program.error('sudo: Sorry', { exitCode: 1 });
                }

                console.log('sudo: OK');
            });
        } catch (error) {
            program.error(error, { exitCode: 1 });
        }
    });

program.parseAsync(process.argv);
