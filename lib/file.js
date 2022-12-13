const db = require('./db');
const async = require('async');
const SIZE_IN_BYTES = 8;

module.exports = {
	size: SIZE_IN_BYTES,
    find: (fileID, callback) => {
		db.ctx.all(`
			SELECT
				f.*,
				f.id AS file_id,
				p.*, p.id AS permission_id
			FROM files f
			LEFT JOIN permissions p ON p.file_id = f.id
			WHERE f.id = $fileID;
		`,
		{ $fileID: fileID }, callback);
    },
    findWith: (id, callback) => {
    	return db.ctx.get(`
    		SELECT
    			f.*,
				f.id AS file_id,
				p.id AS permission_id
    		FROM files f
			LEFT JOIN permissions p ON p.file_id = f.id
			WHERE f.id = $id OR f.name = $id
    	`, { $id: id }, callback);
    },
    new: (name, size, type, content, lastModified, parentID, callback) => {
	    db.ctx.run(`
	    	INSERT INTO files(name, directory_id, size, type, content, last_modified)
	    	VALUES ($name, $parentID, $size, $type, $content, $lastModified);
	    `, {
	        $name: name,
	        $size: size,
	        $type: type,
	        $content: content,
	        $parentID: parentID,
	        $lastModified: lastModified,
	    }, (err, ctx) => {
	    	if (err) {
	    		return callback(err);
	    	}

	    	db.ctx.get('SELECT * FROM files WHERE name = $name AND directory_id = $parentID;', {
	    		$name: name,
	    		$parentID: parentID,
	    	}, callback);
	    });
    },
    children: (directoryID, callback) => {
		db.ctx.all(`
			SELECT
				f.*,
				f.id AS file_id,
				p.*, p.id AS permission_id,
				g.name AS group_name,
				u.username
			FROM files f
			LEFT JOIN permissions p ON p.file_id = f.id
			LEFT JOIN users u ON u.id = p.owner_id
			LEFT JOIN groups g ON g.id = p.group_id
			WHERE f.directory_id = $directoryID;
		`, { $directoryID: directoryID }, callback);
    },
    change: (fileID, file, callback) => {
    	const {
    		name = '',
    		directory_id = '',
    		size = 0,
    		type = '',
    		content = '',
    	} = file;

	    db.ctx.run(`
	    	UPDATE files
	    	SET name=$name,
	    		directory_id=$parentID,
	    		size=$size,
	    		type=$type,
	    		content=$content,
	    		last_modified=$lastModified
	    	WHERE id=$id;
	    `, {
	    	$name: name,
	    	$parentID: directory_id,
	    	$size: size,
	    	$type: type,
	    	$content: content,
	        $lastModified: Date.now(),
	        $id: fileID,
	    }, (err) => {
	    	if (err) {
	    		return callback(err);
	    	}

	    	db.ctx.get('SELECT * FROM files WHERE id = $id', { $id: fileID }, callback);
	    });
    },
   	upsertBytes: (directoryID, bytes, callback) => {
   		db.ctx.run(`
	    	UPDATE files
	    	SET size=size+$bytes,
	    		last_modified=$lastModified
	    	WHERE id=$id;
	    `, { $id: directoryID, $bytes: bytes, $lastModified: Date.now() }, callback);
   	},
    del: (fileID, callback) => {
		db.ctx.run('DELETE FROM files WHERE id = $fileID;', {
			$fileID: fileID,
		}, callback);
    },
};
