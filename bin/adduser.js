#!/usr/bin/env node

const program = require('commander');
const async = require('async');
const inquirer = require('inquirer');

const usr = require('../lib/usr');
const dir = require('../lib/dir');
const pem = require('../lib/pem');
const grp = require('../lib/grp');
const common = require('../lib/common');
const crypto = require('../lib/crypto');

const passwordPrompt = [
    {
        type: 'password',
        name: 'passwd',
        message: 'New password',
        mask: true,
    }
];

const infoPrompt = [
    {
        type: 'input',
        name: 'full_name',
        message: 'Full Name',
        prefix: '   ',
    },
    {
        type: 'input',
        name: 'room_number',
        message: 'Room Number',
        prefix: '   ',
    },
    {
        type: 'input',
        name: 'work_phone',
        message: 'Work Phone',
        prefix: '   ',
    },
    {
        type: 'input',
        name: 'home_phone',
        message: 'Home Phone',
        prefix: '   ',
    },
    {
        type: 'input',
        name: 'other',
        message: 'Other',
        prefix: '   ',
    },
];

program
    .name('adduser')
    .description('adduser - create a new user or update default new user information')
    .argument('LOGIN', '', (text) => text.toLowerCase())
    .option('-m, --create-home', 'create the user\'s home directory if it does not exist.')
    .action((login, options, cmd) => {
        async.waterfall([
            (callback) => {
                common.session.get((err, s) => {
                    if (err || err == 'ERR_EMPTY') {
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
                console.log(`Adding user \`${login}\` ...`);

                usr.new(login, (err, u) => {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, sessionID, u);
                });
            },
            (sessionID, user, callback) => {
                console.log(`Adding new group \`${login}\` ....`);

                grp.new(login, user.id, (err, g) => {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, sessionID, user, g);
                });
            },
            (sessionID, user, group, callback) => {
                pem.default.get((err, p) => {
                    if (err) {
                        return callback(err);
                    }

                    callback(null, sessionID, user, group, p);
                });
            },
            (sessionID, user, group, defaultPem, callback) => {
                if (options.createHome) {
                    console.log(`Creating home directory \`/home/${login}\``);

                    return dir.home((err, baseDir) => {
                        if (err) {
                            return callback(err);
                        }

                        dir.new(login, baseDir.id, (err, homeDir) => {
                            if (err) {
                                return callback(err);
                            }

                            callback(null, sessionID, user, group, defaultPem, homeDir);
                        });
                    });
                }

                callback(null, sessionID, user, group, defaultPem, {});
            },
            (sessionID, user, group, defaultPem, homeDir, callback) => {
                if (options.createHome) {
                    // set user home directory to group staff
                    return pem.new(user.id, 3, defaultPem, null, homeDir.id, (err) => {
                        if (err) {
                            return callback(err);
                        }

                        callback(null, sessionID, user, group, defaultPem, homeDir);
                    });
                }

                callback(null, sessionID, user, group, defaultPem, homeDir);
            },
            (sessionID, user, group, defaultPem, homeDir, callback) => {
                (async () => {
                    const cred = await inquirer.prompt(passwordPrompt);
                    console.log(`Changing the user information for ${login}`);
                    console.log('Enter the new value, or press Enter for the default');
                    const info = await inquirer.prompt(infoPrompt);

                    cred.passwd = crypto.encrypt(cred.passwd);
                    info.home_directory_id = homeDir.id || null;

                    usr.change(user.id, { ...cred, ...info }, (err, record) => {
                        if (err) {
                            return callback(err);
                        }

                        callback(null);
                    });
                })();
            }
        ], (err) => {
            if (err) {
                return program.error(`adduser: ${err}`, { exitCode: 1 });
            }

            console.log('adduser: OK');
        });
    });

program.parse(process.argv);
