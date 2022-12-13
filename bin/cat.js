#!/usr/bin/env node

const util = require('node:util');
const program = require('commander');
const inquirer = require('inquirer');
const dayjs = require('dayjs');
const async = require('async');
const kuler = require('kuler');

const dir = require('../lib/dir');
const file = require('../lib/file');
const pem = require('../lib/pem');
const session = require('../lib/session');
const usr = require('../lib/usr');
const pwd = require('../lib/pwd');
const grp = require('../lib/grp');

program
  	.name('cat')
 	.description('cat - concatenate files and print on the standard output')
	.argument('[FILE...]')
	.option('-w, --write', 'add content to specified file. Create file if it does not exist')
	.action(async (directoriesPath, { write }, cmd) => {
		try {
			async.waterfall([
				(callback) => {
					session.get((err, s) => {
						if (err || s == 'EMPTY') {
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
					pwd.get((err, p) => {
						if (err) {
							return callback(err);
						}

						callback(null, sessionID, user, p.toString().trim());
					});
				},
				(sessionID, user, cwd, callback) => {
					const directoryPathMatrix = [];

					if (!directoriesPath || directoriesPath.length == 0) {
						directoriesPath = [cwd];
					}

					for (let i = directoriesPath.length - 1; i >= 0; i--) {
						directoryPathMatrix[i] = [];

						let directoryPath = directoriesPath[i].split('/');

						if (directoryPath.length == 1) {
							const base = cwd.split('/');
							base.push(...directoryPath);
							directoryPath = base;
						}

						if (directoryPath[0] == '') {
							directoryPath = directoryPath.slice(1);
						}

						for (let j = directoryPath.length - 1; j >= 0; j--) {
							// if (!directoryPathMatrix[i].includes(directoryPath[j])) {
							directoryPathMatrix[i][j] = directoryPath[j];
							// }
						}
					}

					callback(null, sessionID, user, cwd, directoryPathMatrix);
				},
				(sessionID, user, cwd, directoryPathMatrix, callback) => {
					if (write) {
						return callback(null, sessionID, user, cwd, directoryPathMatrix);
					}

					async.each(directoryPathMatrix, (directoryPath, callback) => {
						const [filename, format] = directoryPath[directoryPath.length - 1].split('.');

						return file.findWith(filename, (err, f) => {
							if (err) {
								return callback(err);
							}

							if (!f) {
								return callback(`${directoryPath.join('/')}: No such file or directory`);
							}

							console.log(f.content);
						});
					}, (err) => {
						callback(err);
					});
				},
				(sessionID, user, cwd, directoryPathMatrix, callback) => {
					grp.find(user.username, user.id, (err, g) => {
						if (err) {
							return callback(err);
						}

						return callback(null, sessionID, user, cwd, directoryPathMatrix, g);
					});
				},
				(sessionID, user, cwd, directoryPathMatrix, group, callback) => {
					pem.getDefault((err, p) => {
						if (err) {
							return callback(err);
						}

						callback(null, sessionID, user, cwd, directoryPathMatrix, group, p);
					});
				},
				(sessionID, user, cwd, directoryPathMatrix, group, defaultPem, callback) => {
					const directoryPath = directoryPathMatrix[0];
					const [filename, type] = directoryPath[directoryPath.length - 1].split('.');

					(async () => {
						const info = await inquirer.prompt([
							{
								type: 'input',
								name: 'content',
								message: ' ',
								prefix: '',
							}
						]);

						const c = {
							content: info.content,
							size: info.content.length,
						};

						file.findWith(filename, (err, f) => {
							if (err) {
								return callback(err);
							}

							if (f) {
								return file.change(f.id, { ...f, ...c }, (err, _) => {
									if (err) {
										return callback(err);
									}

									return callback(null, sessionID, user, cwd, directoryPathMatrix, group, defaultPem, c, f, true);
								});
							}

							return callback(null, sessionID, user, cwd, directoryPathMatrix, group, defaultPem, c, null, false);
						});
					})();
				},
				(sessionID, user, cwd, directoryPathMatrix, group, defaultPem, c, f, fileExist, callback) => {
					if (fileExist) {
						return callback(null, user, c, f);
					}

					const directoryPath = directoryPathMatrix[0];
					const [filename, type] = directoryPath[directoryPath.length - 1].split('.');

					file.new(filename, c.size, type, c.content, Date.now(), user.home_directory_id, (err, f) => {
						if (err) {
							return callback(err);
						}

						return pem.new(user.id, group.id, defaultPem, f.id, null, (err) => {
							if (err) {
								return callback(err);
							}

							callback(null, user, c, f);
						});
					});
				},
				(user, c, f, callback) => {
					return dir.changeBytes(f.directory_id, c.size, (err, _) => {
						if (err) {
							return callback(err);
						}

						callback(null);
					});
				}
			], (err, results) => {
				if (err) {
					console.log('cat:', err);
					return;
				}
			});
		} catch (error) {
			console.log(error);
		}
	});

program.parse(process.argv);
