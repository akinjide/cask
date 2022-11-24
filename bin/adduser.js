#!/usr/bin/env node

const program = require('commander');
const path = require('path');
const async = require('async');
const inquirer = require('inquirer');

const usr = require('../lib/usr');
const dir = require('../lib/dir');
const pem = require('../lib/pem');
const grp = require('../lib/group');
const session = require('../lib/session');
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
	},
	{
		type: 'input',
		name: 'room_number',
		message: 'Room Number',
	},
	{
		type: 'input',
		name: 'work_phone',
		message: 'Work Phone',
	},
	{
		type: 'input',
		name: 'home_phone',
		message: 'Home Phone',
	},
	{
		type: 'input',
		name: 'other',
		message: 'Other',
	},
];

program
  	.name('adduser')
 	.description('adduser - create a new user or update default new user information')
	.argument('LOGIN', '', (text) => text.toLowerCase())
	.option('-m, --create-home', 'create the user\'s home directory if it does not exist.')
	.action((login, { createHome }, cmd) => {
		try {
			async.waterfall([
				(callback) => {
					session.get((err, data) => {
						if (err || data == 'EMPTY') {
							return callback('no active session');
						}

						if (data.toString() != pem.ROOT) {
							return callback(`${login}: Permission denied`);
						}

						return callback(null, data);
					});
				},
				(sessionID, callback) => {
					console.log(`Adding user \`${login}\` ...`);

					usr.new(login, (err, record) => {
						if (err) {
							return callback(err);
						}

						callback(null, sessionID, record);
					});
				},
				(sessionID, user, callback) => {
					console.log(`Adding new group \`${login}\` ....`);

					grp.new(login, user.id, (err, record) => {
						if (err) {
							return callback(err);
						}

						callback(null, sessionID, user, record);
					});
				},
				(sessionID, user, group, callback) => {
					pem.getDefault((err, p) => {
						if (err) {
							return callback(err);
						}

						callback(null, sessionID, user, group, p);
					});
				},
				(sessionID, user, group, defaultPem, callback) => {
					if (createHome) {
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
					if (createHome) {
						// TODO: set to 'staff'
						return pem.new(user.id, group.id, homeDir.id, defaultPem, (err) => {
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

						// encrypt password;
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
					console.log('adduser:', err);
					return;
				}

				console.log('adduser: OK');
			});
		} catch (error) {
			console.log(error);
		}
	});

program.parse(process.argv);
