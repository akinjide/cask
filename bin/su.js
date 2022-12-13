#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');
const async = require('async');

const usr = require('../lib/usr');
const dsk = require('../lib/dsk');
const crypto = require('../lib/crypto');
const pem = require('../lib/pem');


// .action(function() {
//   console.error('Run script on port %s', this.args[0]);
// })
// .hook('preAction', (thisCommand, actionCommand) => {
//   console.log('preAction');

//   if (thisCommand.opts().profile) {
//     console.time(timeLabel);
//   }
// })
// .hook('postAction', (thisCommand, actionCommand) => {
//   console.log('postAction');

//   if (thisCommand.opts().profile) {
//     console.timeEnd(timeLabel);
//   }
// })

program
  	.name('su')
 	.description('su - run a command with substitute user')
	.argument('[username]', '', 'root')
	.action(async (username, { createHome }, cmd) => {
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
					console.log('su: Sorry');
					return;
				}

				async.parallel([
					(callback) => {
						dsk.session.set(id, callback);
					},
					(callback) => {
						let home = `/home/${username}`;

						if (id == pem.ROOT) {
							home = '/root';
						}

						dsk.pwd.set(home, callback);
					},
				], (err) => {
					if (err) {
						console.log('su: Sorry');
						return;
					}

					console.log('su: OK');
				});
			});
		} catch (error) {
			console.log(error);
		}
	});

program.parse(process.argv);
