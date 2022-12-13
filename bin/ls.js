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
const common = require('../lib/common');
const usr = require('../lib/usr');

program
  	.name('ls')
 	.description('ls - list directory contents')
	.argument('[FILE...]')
	.option('-l', 'use a long listing format')
	.option('-i, --inode', 'print the index number of each file')
	.option('-d, --directory', 'list directory entries instead of contents, and do not dereference symbolic links')
	.action(async (directoriesPath, { l, inode, directory }, cmd) => {
		cmd.on('sudoer', () => {
			console.log('yeet');
		});

		console.log(cmd);
		console.log(this.arguments);

		try {
			async.waterfall([
				(callback) => {
					common.session.get((err, s) => {
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

						// console.log(u);
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

					callback(null, directoryPathMatrix);
				},
				(directoryPathMatrix, callback) => {
					for (let i = directoryPathMatrix.length - 1; i >= 0; i--) {
						dir.exist(directoryPathMatrix[i], (err, exist) => {
							if (!exist) {
								return callback(`${directoryPathMatrix[i].join('/')}: No such file or directory`);
							}

							dir.find(directoryPathMatrix[i][directoryPathMatrix[i].length - 1], (err, d) => {
								async.parallel([
									(callback) => {
										return file.children(d.directory_id, callback);
									},
									(callback) => {
										return dir.children(d.directory_id, callback);
									},
								], (err, [files, directories]) => {
									if (err) {
										return callback(err);
									}

									const total = (files.length + directories.length);
									let fileCounter = 0;
									let dirCounter = 0;

									if (!total) {
										return;
									}

									if (directoryPathMatrix.length > 1) {
										console.log(`${directoryPathMatrix[i].join('/')}:`);
									}

									console.log(`total ${total}`);

									while (true) {
										if (directories[dirCounter]) {
											const d = directories[dirCounter++];

											console.log(util.format(
												`%s%s%s%s  %s %s %s\t%s %s ${kuler('%s', '#0000FF')}`,
												d.type,
												pem.toASCII(d.p_user),
												pem.toASCII(d.p_group),
												pem.toASCII(d.p_other),
												'1',
												d.username,
												d.group_name.padStart(8),
												d.size.toString().padStart(4),
												dayjs(d.last_modified).format('MMM  DD HH:mm'),
												d.name,
											));
											continue;
										}

										if (files[fileCounter]) {
											const f = files[fileCounter++];

											console.log(util.format(
												'%s%s%s%s  %s %s %s\t%s %s %s',
												'-',
												pem.toASCII(f.p_user),
												pem.toASCII(f.p_group),
												pem.toASCII(f.p_other),
												'1',
												f.username,
												f.group_name.padStart(8),
												f.size.toString().padStart(4),
												dayjs(f.last_modified).format('MMM  DD HH:mm'),
												(f.type ? `${f.name}.${f.type}` : f.name),
											));
											continue;
										}

										if (!directories[dirCounter] && !files[fileCounter]) {
											break;
										}
									}

									if (directoryPathMatrix.length == i) {
										callback(null);
									}
								});
							});
						});
					}
				},
			], (err, results) => {
				if (err) {
					console.log('ls:', err);
					return;
				}
			});
		} catch (error) {
			console.log(error);
		}
	});

program.parse(process.argv);
