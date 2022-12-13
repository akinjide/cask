const path = require('path');
const fs = require('node:fs');
const session = path.resolve(process.cwd(), '..', '.session');
const sudo = path.resolve(process.cwd(), '..', '.sudo');
const wd = path.resolve(process.cwd(), '..', '.pwd');

module.exports = {
	session: {
		get: (callback) => {
			fs.readFile(session, (err, data) => {
				if (err) {
					return callback(err);
				}

				if (!data.length) {
					return callback('EMPTY');
				}

				return callback(null, data);
			});
		},
		set: (id, callback) => {
			fs.writeFile(session, id+"", callback);
		},
	},
	sudo: {
		get: (callback) => {
			fs.readFile(sudo, (err, data) => {
				if (err) {
					return callback(err);
				}

				if (!data.length) {
					return callback('EMPTY');
				}

				return callback(null, data);
			});
		},
		set: (id, callback) => {
			fs.writeFile(sudo, id+"", callback);
		},
	},
	pwd: {
		get: (callback) => {
			fs.readFile(wd, (err, data) => {
				if (err) {
					return callback(err);
				}

				if (!data.length) {
					const pwd = '/home';

					return p.set(pwd, (err) => {
						callback(null, Buffer.from(pwd));
					});
				}

				return callback(null, data);
			});
		},
		set: (pwd, callback) => {
			fs.writeFile(workingDirectory, pwd, callback);
		}
	}
};
