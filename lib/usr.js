const db = require('./db');
const async = require('async');

module.exports = {
    new: (username, callback) => {
	    db.ctx.run('INSERT INTO users(username, last_modified) VALUES ($username, $lastModified);', {
	        $username: username,
	        $lastModified: Date.now(),
	    }, (err) => {
	    	if (err) {
	    		return callback(err);
	    	}

	    	db.ctx.get('SELECT * FROM users WHERE username = $username', { $username: username }, callback);
	    });
    },
    find: (username, callback) => {
    	return db.ctx.get('SELECT * FROM users WHERE username = $username', { $username: username }, callback);
    },
    change: (userID, info, callback) => {
    	const {
    		full_name = '',
    		room_number = '',
    		work_phone = '',
    		home_phone = '',
    		other = '',
    		home_directory_id,
    		passwd,
    	} = info;

	    db.ctx.run('UPDATE users SET full_name=$fullName, room_number=$roomNumber, work_phone=$workPhone, home_phone=$homePhone, other=$other, password=$password, home_directory_id=$homeDirID, last_modified=$lastModified WHERE id=$id;', {
	    	$fullName: full_name,
	    	$roomNumber: room_number,
	    	$workPhone: work_phone,
	    	$homePhone: home_phone,
	    	$other: other,
	    	$password: passwd,
	    	$homeDirID: home_directory_id,
	        $lastModified: Date.now(),
	        $id: userID,
	    }, (err) => {
	    	if (err) {
	    		return callback(err);
	    	}

	    	db.ctx.get('SELECT * FROM users WHERE id = $id', { $id: userID }, callback);
	    });
    },
};
