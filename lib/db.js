const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.resolve(process.cwd(), '..', 'cask.sqlite'));

const crypto = require('./crypto');

module.exports = {
  ctx: db,
  up: (db, callback) => {
    db.all('SELECT * FROM permissions', (err, rows) => {
      if (err) {
        db.serialize(() => {
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
        });
      }
    });
  },
  down: (db, callback) => {
    db.all('SELECT * FROM permissions', (err, rows) => {
      if (!err && (rows && rows.length >= 0)) {
        db.serialize(() => {
          db.exec('DROP TABLE groups;');
          db.exec('DROP TABLE users;');
          db.exec('DROP TABLE user_groups;');
          db.exec('DROP TABLE directories;');
          db.exec('DROP TABLE files;');
          db.exec('DROP TABLE permissions;');
          db.exec('DROP TABLE default_permissions;');
        });
        callback(null);
      }
    });
  },
  seed: (db, callback) => {
    db.all('SELECT * FROM permissions', (err, rows) => {
      if (!err && (rows && rows.length == 0)) {
        db.serialize(() => {
          db.run('INSERT INTO users (username, full_name, password, home_directory_id, last_modified) VALUES ($username, $fullName, $password, $homeDirID, $lastModified);', {
            $username: 'root',
            $fullName: 'Root',
            $password: crypto.encrypt('toor'),
            $homeDirID: 2,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO users (username, full_name, password, home_directory_id, last_modified) VALUES ($username, $fullName, $password, $homeDirID, $lastModified);', {
            $username: 'akinjide',
            $fullName: 'Akinjide Bankole',
            $password: crypto.encrypt('groot'),
            $homeDirID: 3,
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

          db.run('INSERT INTO groups (name, last_modified) VALUES ($name, $lastModified);', {
            $name: 'akinjide',
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO directories (name, size, type, last_modified) VALUES ($name, $size, $type, $lastModified);', {
            $name: 'root',
            $size: 0,
            $type: 'd',
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO directories (name, size, type, last_modified) VALUES ($name, $size, $type, $lastModified);', {
            $name: 'home',
            $size: 0,
            $type: 'd',
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO directories (name, size, type, parent_id, last_modified) VALUES ($name, $size, $type, $parentID, $lastModified);', {
            $name: 'akinjide',
            $size: 60,
            $type: 'd',
            $parentID: 2,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO directories (name, size, type, parent_id, last_modified) VALUES ($name, $size, $type, $parentID, $lastModified);', {
            $name: 'Desktop',
            $size: 0,
            $type: 'd',
            $parentID: 3,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO directories (name, size, type, parent_id, last_modified) VALUES ($name, $size, $type, $parentID, $lastModified);', {
            $name: 'Downloads',
            $size: 0,
            $type: 'd',
            $parentID: 3,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO directories (name, size, type, parent_id, last_modified) VALUES ($name, $size, $type, $parentID, $lastModified);', {
            $name: 'Documents',
            $size: 0,
            $type: 'd',
            $parentID: 3,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO directories (name, size, type, parent_id, last_modified) VALUES ($name, $size, $type, $parentID, $lastModified);', {
            $name: 'Music',
            $size: 0,
            $type: 'd',
            $parentID: 3,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO directories (name, size, type, parent_id, last_modified) VALUES ($name, $size, $type, $parentID, $lastModified);', {
            $name: 'Pictures',
            $size: 0,
            $type: 'd',
            $parentID: 3,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO files (name, size, type, directory_id, content, last_modified) VALUES ($name, $size, $type, $directoryID, $content, $lastModified);', {
            $name: 'README',
            $size: 60,
            $type: 'md',
            $directoryID: 3,
            $content: 'Welcome to Cask\nInterdum accumsan dictumst fermentum, rhoncus lacinia suscipit, \nplatea nec convallis cursus cubilia odio molestie lorem. \nLectus augue aliquam, lorem fusce pretium fames fringilla. \nPlacerat lorem nam, interdum vel aenean cubilia sociosqu. \nCursus lacus, ornare rutrum turpis. \nEnim sociosqu inceptos, vivamus feugiat, sollicitudin erat hendrerit pharetra nam neque. \nVarius himenaeos, magna mi placerat. \nLibero in integer nostra, vivamus at ligula, etiam orci viverra ultrices laoreet ut ullamcorper felis. \nDui fusce volutpat, proin est, varius ligula platea sagittis hac vulputate tincidunt.',
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO directories (name, size, type, parent_id, last_modified) VALUES ($name, $size, $type, $parentID, $lastModified);', {
            $name: 'bin',
            $size: 0,
            $type: 'd',
            $parentID: 1,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO directories (name, size, type, parent_id, last_modified) VALUES ($name, $size, $type, $parentID, $lastModified);', {
            $name: 'var',
            $size: 0,
            $type: 'd',
            $parentID: 1,
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

          db.run('INSERT INTO user_groups (user_id, group_id, last_modified) VALUES ($userID, $groupID, $lastModified);', {
            $userID: 2,
            $groupID: 2,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO user_groups (user_id, group_id, last_modified) VALUES ($userID, $groupID, $lastModified);', {
            $userID: 2,
            $groupID: 3,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO user_groups (user_id, group_id, last_modified) VALUES ($userID, $groupID, $lastModified);', {
            $userID: 2,
            $groupID: 4,
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

          db.run('INSERT INTO permissions (p_user, p_group, p_other, directory_id, owner_id, group_id, last_modified) VALUES ($pUser, $pGroup, $pOther, $directoryID, $ownerID, $groupID, $lastModified);', {
            $pUser: 7,
            $pGroup: 7,
            $pOther: 0,
            $directoryID: 2,
            $ownerID: 1,
            $groupID: 3,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO permissions (p_user, p_group, p_other, directory_id, owner_id, group_id, last_modified) VALUES ($pUser, $pGroup, $pOther, $directoryID, $ownerID, $groupID, $lastModified);', {
            $pUser: 7,
            $pGroup: 5,
            $pOther: 5,
            $directoryID: 3,
            $ownerID: 2,
            $groupID: 3,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO permissions (p_user, p_group, p_other, directory_id, owner_id, group_id, last_modified) VALUES ($pUser, $pGroup, $pOther, $directoryID, $ownerID, $groupID, $lastModified);', {
            $pUser: 7,
            $pGroup: 5,
            $pOther: 5,
            $directoryID: 4,
            $ownerID: 2,
            $groupID: 4,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO permissions (p_user, p_group, p_other, directory_id, owner_id, group_id, last_modified) VALUES ($pUser, $pGroup, $pOther, $directoryID, $ownerID, $groupID, $lastModified);', {
            $pUser: 7,
            $pGroup: 5,
            $pOther: 5,
            $directoryID: 5,
            $ownerID: 2,
            $groupID: 4,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO permissions (p_user, p_group, p_other, directory_id, owner_id, group_id, last_modified) VALUES ($pUser, $pGroup, $pOther, $directoryID, $ownerID, $groupID, $lastModified);', {
            $pUser: 7,
            $pGroup: 5,
            $pOther: 5,
            $directoryID: 6,
            $ownerID: 2,
            $groupID: 4,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO permissions (p_user, p_group, p_other, directory_id, owner_id, group_id, last_modified) VALUES ($pUser, $pGroup, $pOther, $directoryID, $ownerID, $groupID, $lastModified);', {
            $pUser: 7,
            $pGroup: 5,
            $pOther: 5,
            $directoryID: 7,
            $ownerID: 2,
            $groupID: 4,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO permissions (p_user, p_group, p_other, directory_id, owner_id, group_id, last_modified) VALUES ($pUser, $pGroup, $pOther, $directoryID, $ownerID, $groupID, $lastModified);', {
            $pUser: 7,
            $pGroup: 5,
            $pOther: 5,
            $directoryID: 8,
            $ownerID: 2,
            $groupID: 4,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO permissions (p_user, p_group, p_other, file_id, owner_id, group_id, last_modified) VALUES ($pUser, $pGroup, $pOther, $fileID, $ownerID, $groupID, $lastModified);', {
            $pUser: 7,
            $pGroup: 5,
            $pOther: 5,
            $fileID: 1,
            $ownerID: 2,
            $groupID: 4,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO permissions (p_user, p_group, p_other, directory_id, owner_id, group_id, last_modified) VALUES ($pUser, $pGroup, $pOther, $directoryID, $ownerID, $groupID, $lastModified);', {
            $pUser: 7,
            $pGroup: 5,
            $pOther: 5,
            $directoryID: 9,
            $ownerID: 1,
            $groupID: 1,
            $lastModified: Date.now(),
          });

          db.run('INSERT INTO permissions (p_user, p_group, p_other, directory_id, owner_id, group_id, last_modified) VALUES ($pUser, $pGroup, $pOther, $directoryID, $ownerID, $groupID, $lastModified);', {
            $pUser: 7,
            $pGroup: 5,
            $pOther: 5,
            $directoryID: 10,
            $ownerID: 1,
            $groupID: 1,
            $lastModified: Date.now(),
          });
        })
      }

      db.each('SELECT * FROM permissions;', (err, rows) => {
        callback(null);
      });
    });
  },
};
