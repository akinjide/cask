const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.resolve(process.cwd(), '..', 'cask.sqlite'));

const crypto = require('./crypto');

module.exports = {
  ctx: db,
  up: (db, callback) => {
    db.serialize(() => {
      db.all('SELECT * FROM permissions', (err, rows) => {
        if (err) {
          db.run('CREATE TABLE groups (\
            id INTEGER PRIMARY KEY AUTOINCREMENT, \
            name TEXT, \
            last_modified INTEGER \
          )');

          db.run('CREATE TABLE users (\
            id INTEGER PRIMARY KEY AUTOINCREMENT, \
            full_name TEXT, \
            username TEXT, \
            password TEXT, \
            home_phone TEXT, \
            work_phone TEXT, \
            room_number TEXT, \
            other TEXT, \
            home_directory_id INTEGER, \
            last_modified INTEGER)');

          db.run('CREATE TABLE user_groups (\
            user_id INTEGER, \
            group_id INTEGER, \
            last_modified INTEGER \
          )');

          db.run('CREATE TABLE directories (\
            id INTEGER PRIMARY KEY AUTOINCREMENT, \
            name TEXT, \
            size INTEGER, \
            type CHAR(1), \
            parent_id INTEGER, \
            last_modified INTEGER)');

          db.run('CREATE TABLE files (\
            id INTEGER PRIMARY KEY AUTOINCREMENT, \
            name TEXT, \
            directory_id INTEGER, \
            size INTEGER, \
            type CHAR(20), \
            content TEXT, \
            last_modified INTEGER)');

          // permissions belongs to files/directories
          // but has to be linked to group and user
          db.run('CREATE TABLE permissions (\
            id INTEGER PRIMARY KEY AUTOINCREMENT, \
            p_user INTEGER, \
            p_group INTEGER, \
            p_other INTEGER, \
            file_id INTEGER, \
            directory_id INTEGER, \
            owner_id INTEGER, \
            group_id INTEGER, \
            last_modified INTEGER)');

          db.run('CREATE TABLE default_permissions (\
            p_user INTEGER, \
            p_group INTEGER, \
            p_other INTEGER, \
            last_modified INTEGER)');

          callback(null);
        }
      });
    });
  },
  down: (db, callback) => {
    db.serialize(() => {
      db.all('SELECT * FROM permissions', (err, rows) => {
        if (!err && (rows && rows.length >= 0)) {
          db.exec('DROP TABLE groups;');
          db.exec('DROP TABLE users;');
          db.exec('DROP TABLE user_groups;');
          db.exec('DROP TABLE directories;');
          db.exec('DROP TABLE files;');
          db.exec('DROP TABLE permissions;');
          db.exec('DROP TABLE default_permissions;');
          callback(null);
        }
      });
    });
  },
  seed: (db, callback) => {
    db.serialize(() => {
      db.all('SELECT * FROM permissions', (err, rows) => {
        if (!err && (rows && rows.length == 0)) {
          db.run('INSERT INTO users (username, full_name, password, home_directory_id, last_modified) VALUES ($username, $fullName, $password, $homeDirID, $lastModified);', {
            $username: 'root',
            $fullName: 'System Administrator',
            $password: crypto.encrypt('toor'),
            $homeDirID: 2,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO groups (name, last_modified) VALUES ($name, $lastModified);', {
            $name: 'root',
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO groups (name, last_modified) VALUES ($name, $lastModified);', {
            $name: 'sudo',
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO groups (name, last_modified) VALUES ($name, $lastModified);', {
            $name: 'staff',
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO directories (name, size, type, last_modified) VALUES ($name, $size, $type, $lastModified);', {
            $name: 'home',
            $size: 0,
            $type: 'd',
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO directories (name, size, type, last_modified) VALUES ($name, $size, $type, $lastModified);', {
            $name: 'root',
            $size: 0,
            $type: 'd',
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO default_permissions (p_user, p_group, p_other, last_modified) VALUES ($pUser, $pGroup, $pOther, $lastModified);', {
            $pUser: 7,
            $pGroup: 5,
            $pOther: 5,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO user_groups (user_id, group_id, last_modified) VALUES ($userID, $groupID, $lastModified);', {
            $userID: 1,
            $groupID: 1,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO user_groups (user_id, group_id, last_modified) VALUES ($userID, $groupID, $lastModified);', {
            $userID: 1,
            $groupID: 2,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO user_groups (user_id, group_id, last_modified) VALUES ($userID, $groupID, $lastModified);', {
            $userID: 1,
            $groupID: 3,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO permissions (p_user, p_group, p_other, directory_id, owner_id, group_id, last_modified) VALUES ($pUser, $pGroup, $pOther, $directoryID, $ownerID, $groupID, $lastModified);', {
            $pUser: 7,
            $pGroup: 7,
            $pOther: 0,
            $directoryID: 2,
            $ownerID: 1,
            $groupID: 1,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO permissions (p_user, p_group, p_other, directory_id, owner_id, group_id, last_modified) VALUES ($pUser, $pGroup, $pOther, $directoryID, $ownerID, $groupID, $lastModified);', {
            $pUser: 7,
            $pGroup: 5,
            $pOther: 5,
            $directoryID: 1,
            $ownerID: 1,
            $groupID: 1,
            $lastModified: Date.now(),
          });
        }

        db.each('SELECT * FROM permissions;', (err, rows) => {
          console.log(rows);
          callback(null);
        });
      });
    });
  },
};
