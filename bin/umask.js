#!/usr/bin/env node

const program = require('commander');
const async = require('async');

const pem = require('../lib/pem');
const common = require('../lib/common');

program
    .name('umask')
    .description('umask - set file mode creation mask')
    .argument('mode')
    .action((mode, cmd) => {
        if (!mode || mode.length > 3) {
            return program.error('umask: Sorry\nTry umask 775, not 0775 (0 - special modes not allowed)', { exitCode: 1 });
        }

        const octal = pem.translate(mode.split(''));

        if (octal === -1) {
            return program.error('umask: Sorry\nTry umask 775, not 0775 (0 - special modes not allowed)', { exitCode: 1 });
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
                        return callback(`${mode}: Permission denied`);
                    }

                    return callback(null, sessionID);
                });
            },
            (sessionID, callback) => {
                pem.default.set(octal, callback);
            },
        ], (err) => {
            if (err) {
                return program.error(`umask: ${err}`, { exitCode: 1 });
            }

            console.log('umask: OK');
        });
    });

program.parse(process.argv);
