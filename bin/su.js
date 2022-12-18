#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');
const async = require('async');

const usr = require('../lib/usr');
const common = require('../lib/common');
const crypto = require('../lib/crypto');
const pem = require('../lib/pem');

program
    .name('su')
    .description('su - run a command with substitute user')
    .argument('[username]', '', 'root')
    .action(async (username, cmd) => {
        try {
            const { passwd } = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'passwd',
                    message: 'Password',
                    mask: true,
                }
            ]);

            usr.find(username, (err, { password, id, name }) => {
                if (err || !crypto.compare(password, passwd)) {
                    return program.error('su: Sorry', { exitCode: 1 });
                }

                async.parallel([
                    (callback) => {
                        common.session.set(id, callback);
                    },
                    (callback) => {
                        common.sudo.set('-1', callback);
                    },
                    (callback) => {
                        let home = `/home/${username}`;

                        if (id == pem.ROOT) {
                            home = '/root';
                        }

                        common.pwd.set(home, callback);
                    },
                ], (err) => {
                    if (err) {
                        return program.error('su: Sorry', { exitCode: 1 });
                    }

                    console.log('su: OK');
                });
            });
        } catch (error) {
            program.error(error, { exitCode: 1 });
        }
    });

program.parse(process.argv);
