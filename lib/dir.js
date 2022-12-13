const db = require('./db');
const async = require('async');
const SIZE_IN_BYTES = 8;

const dir = {
	size: SIZE_IN_BYTES,
	base: (callback) => {
		db.ctx.get('SELECT * FROM directories WHERE parent_id = $parentID', { $parentID: null }, callback);
	},
	home: (callback)  => {
		// dir.find('home', callback);
		db.ctx.get('SELECT * FROM directories WHERE name = $name', { $name: 'home' }, callback);
	},
    new: (directoryName, parentID, callback) => {
	    db.ctx.serialize(() => {
			db.ctx.run(`
				INSERT INTO directories (parent_id, name, size, type, last_modified)
				VALUES ($parentID, $name, $size, $type, $lastModified);
			`, {
				$parentID: parentID,
				$name: directoryName,
				$size: 0,
				$type: 'd',
				$lastModified: Date.now(),
			});

            db.ctx.get('SELECT * FROM directories WHERE name = $name', { $name: directoryName }, (err, directory) => {
                if (err) {
                    return callback(err);
                }

                callback(err, directory);
            });
	    });
    },
   	changeBytes: (directoryID, bytes, callback) => {
   		db.ctx.run(`
	    	UPDATE directories
	    	SET size=size+$bytes,
	    		last_modified=$lastModified
	    	WHERE id=$id;
	    `, { $id: directoryID, $bytes: bytes, $lastModified: Date.now() }, callback);
   	},
    find: (directoryName, callback) => {
		db.ctx.get(`
			SELECT
				d.*,
				d.id AS directory_id,
				p.*,
				p.id AS permission_id
			FROM directories d
			LEFT JOIN permissions p ON p.directory_id = d.id
			WHERE d.name = $name
		`,
		{ $name: directoryName }, callback);
    },
    findWith: (id, callback) => {
		db.ctx.get(`
			SELECT
				d.*,
				d.id AS directory_id,
				p.*,
				p.id AS permission_id
			FROM directories d
			LEFT JOIN permissions p ON p.directory_id = d.id
			WHERE d.id = $id OR d.name = $id
		`,
		{ $id: id }, callback);
    },
    exist: (directoryPath, callback) => {
    	dir.find(directoryPath[directoryPath.length - 1], (err, directory) => {
    		if (!directoryPath.length) {
    			return callback(null, true)
    		}

    		if (err || !directory) {
    			return callback(err, false);
    		}

    		return dir.exist(directoryPath.slice(0, directoryPath.length - 1), callback);
    	});
    },
    search: (directoryPath, queue, callback) => {
        dir.find(directoryPath[directoryPath.length - 1], (err, directory) => {
            if (!directoryPath.length) {
                return callback(null, queue.length == 0);
            }

            if (err) {
                return callback(err, false);
            }

            if (!directory) {
                queue.push(...directoryPath.slice(directoryPath.length - 1, directoryPath.length));
            }

            return dir.search(directoryPath.slice(0, directoryPath.length - 1), queue, callback);
        });
    },
    children: (parentID, callback) => {
		db.ctx.all(`
			SELECT
				d.*,
				d.id AS directory_id,
				p.*,
				p.id AS permission_id,
				g.name AS group_name,
				u.username
			FROM directories d
			LEFT JOIN permissions p ON p.directory_id = d.id
			LEFT JOIN users u ON u.id = p.owner_id
			LEFT JOIN groups g ON g.id = p.group_id
			WHERE d.parent_id = $parentID
		`,
		{ $parentID: parentID }, callback);
    },
    del: (directoryID, callback) => {
		db.ctx.run('DELETE FROM directories WHERE id = $directoryID;', {
			$directoryID: directoryID,
		}, callback);
    }
};

module.exports = dir;
