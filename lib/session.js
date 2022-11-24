const path = require('path');
const fs = require('node:fs');
const session = path.resolve(process.cwd(), '..', '.session');

const exist = () => {

};

module.exports = {
	get: (callback) => {
		fs.readFile(session, (err, data) => {
			if (err) {
				return callback(err);
			}

			if (!data) {
				return callback('EMPTY');
			}

			return callback(null, data);
		});
	},
	set: (id, callback) => {
		fs.writeFile(session, id+"", callback);
	},
};
