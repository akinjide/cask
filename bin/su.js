#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');

const db = require('../lib/db');
const usr = require('../lib/usr');
const session = require('../lib/session');
const crypto = require('../lib/crypto');

program
  	.name('su')
 	.description('su - run a command with substitute user')
	.argument('username')
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

				session.set(id, (err) => {
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
