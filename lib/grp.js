const db = require('./db');

const g = {
    new: (name, userID, callback) => {
        db.ctx.serialize(() => {
            db.ctx.run('INSERT INTO groups (name, last_modified) VALUES ($name, $lastModified);', {
                $name: name,
                $lastModified: Date.now(),
            });

            db.ctx.get('SELECT * FROM groups WHERE name = $name', { $name: name }, (err, group) => {
                if (err) {
                    return callback(err);
                }

                db.ctx.run('INSERT INTO user_groups (user_id, group_id, last_modified) VALUES ($userID, $groupID, $lastModified);', {
                    $userID: userID,
                    $groupID: group.id,
                    $lastModified: Date.now(),
                });

                callback(err, group);
            });
        });
    },
    find: (name, callback) => {
        return db.ctx.get('SELECT * FROM groups WHERE name = $name', { $name: name }, callback);
    },
    findWith: (id, callback) => {
        return db.ctx.get('SELECT * FROM groups WHERE id = $id OR name = $id', { $id: id }, callback);
    },
    findWithUser: (name, userID, callback) => {
        db.ctx.get(`
            SELECT
                g.*,
                ug.*
            FROM groups g
            LEFT JOIN user_groups ug ON ug.group_id = g.id
            WHERE g.name = $name
            AND ug.user_id = $userID
        `, { $name: name, $userID: userID }, (err, group) => {
            if (err) {
                return callback(err);
            }

            callback(err, group);
        });
    },
    findAll: (userID, callback) => {
        db.ctx.all(`
            SELECT
                g.*,
                ug.*
            FROM groups g
            LEFT JOIN user_groups ug ON ug.group_id = g.id
            WHERE ug.user_id = $userID
        `, { $userID: userID }, (err, group) => {
            if (err) {
                return callback(err);
            }

            callback(err, group);
        });
    },
    search: (groups, userID, queue, callback) => {
        g.find(groups[groups.length - 1], userID, (err, group) => {
            if (!groups.length) {
                return callback(null, queue.length == 0);
            }

            if (err) {
                return callback(err, false);
            }

            if (!group) {
                queue.push(...groups.slice(groups.length - 1, groups.length));
            }

            return g.search(groups.slice(0, groups.length - 1), userID, queue, callback);
        });
    },
    add: (name, userID, callback) => {
        db.ctx.get('SELECT * FROM groups WHERE name = $name', { $name: name }, (err, group) => {
            if (err) {
                return callback(err);
            }

            db.ctx.run('INSERT INTO user_groups (user_id, group_id, last_modified) VALUES ($userID, $groupID, $lastModified);', {
                $userID: userID,
                $groupID: group.id,
                $lastModified: Date.now(),
            });

            callback(err, group);
        });
    },
    del: (name, userID, callback) => {
        db.ctx.get('SELECT * FROM groups WHERE name = $name', { $name: name }, (err, group) => {
            if (err) {
                return callback(err);
            }

            db.ctx.run('DELETE FROM user_groups WHERE user_id = $userID AND group_id = $groupID;', {
                $userID: userID,
                $groupID: group.id,
            });

            callback(err, group);
        });
    },
};

module.exports = g;
