const db = require('./db');
const OCTAL = {
    READ: 4,
    WRITE: 2,
    EXECUTE: 1,
    NULL: 0,
};

const OCTAL_TO_ASCII = {
    [OCTAL.READ]: 'r',
    [OCTAL.WRITE]: 'w',
    [OCTAL.EXECUTE]: 'x',
    [OCTAL.NULL]: '-',
};

const UMASK = {
    0: OCTAL.READ+OCTAL.WRITE+OCTAL.EXECUTE, // rwx
    1: OCTAL.READ+OCTAL.WRITE, // rw-
    2: OCTAL.READ+OCTAL.EXECUTE, // r-x
    3: OCTAL.READ, // r--
    4: OCTAL.WRITE+OCTAL.EXECUTE, // -wx
    5: OCTAL.WRITE, // -w-
    6: OCTAL.EXECUTE, // --x
    7: OCTAL.NULL, // ---
};

const USER_ROOT = 1;
const GROUP_ROOT = 3;
const GROUP_SUDO = 2;

const p = {
    ROOT: USER_ROOT,
    SUDOERS: GROUP_SUDO,
    default: {
        get: (callback) => {
            db.ctx.get('SELECT * FROM default_permissions', callback);
        },
        set: (umask, callback) => {
            db.ctx.run(`
                UPDATE default_permissions
                SET p_user=$pUser, p_group=$pGroup, p_other=$pOther, last_modified=$lastModified;
            `, {
                $pUser: umask[0],
                $pGroup: umask[1],
                $pOther: umask[2],
                $lastModified: Date.now(),
            }, callback);
        },
    },
    new: (userID, groupID, permission, fileID, directoryID, callback) => {
        db.ctx.run(`
            INSERT INTO permissions (p_user, p_group, p_other, file_id, directory_id, owner_id, group_id, last_modified)
            VALUES ($pUser, $pGroup, $pOther, $fileID, $directoryID, $ownerID, $groupID, $lastModified);
        `, {
            $pUser: permission.p_user,
            $pGroup: permission.p_group,
            $pOther: permission.p_other,
            $fileID: fileID,
            $directoryID: directoryID,
            $ownerID: userID,
            $groupID: groupID,
            $lastModified: Date.now(),
        }, callback);
    },
    del: (permissionID, callback) => {
        db.ctx.run('DELETE FROM permissions WHERE id = $permissionID;', {
            $permissionID: permissionID,
        }, callback);
    },
    find: (permissionID, callback) => {
        db.ctx.get('SELECT * FROM permissions WHERE id = $permissionID', {
            $permissionID: permissionID,
        }, callback);
    },
    change: (permissionID, permission, callback) => {
        const {
            p_user,
            p_group,
            p_other,
            file_id,
            directory_id,
            owner_id,
            group_id,
        } = permission;

        db.ctx.run(`
            UPDATE permissions SET
                p_user=$pUser,
                p_group=$pGroup,
                p_other=$pOther,
                file_id=$fileID,
                directory_id=$directoryID,
                owner_id=$ownerID,
                group_id=$groupID,
                last_modified=$lastModified
            WHERE id = $permissionID;`,
        {
            $pUser: p_user,
            $pGroup: p_group,
            $pOther: p_other,
            $fileID: file_id,
            $directoryID: directory_id,
            $ownerID: owner_id,
            $groupID: group_id,
            $lastModified: Date.now(),
            $permissionID: permissionID,
        }, (err) => {
            if (err) {
                return callback(err);
            }

            return p.find(permissionID, callback);
        });
    },
    translate: (octal) => {
        const readable = [];

        for (let i = octal.length - 1; i >= 0; i--) {
            if (UMASK[octal[i]] === undefined) {
                return -1;
            }

            readable[i] = UMASK[octal[i]];
        }

        return readable;
    },
    toASCII: (octal) => {
        let text = ['-', '-', '-'];

        if (p.read(octal)) {
            text[0] = 'r';
        }

        if (p.write(octal)) {
            text[1] = 'w';
        }

        if (p.exec(octal)) {
            text[2] = 'x';
        }

        return text.join('');
    },
    // current user belongs to the group associated with the file
    belongs: (userGroups, groupID) => {
        const groups = userGroups.split(',');

        for (let i = 0; i < groups.length; i++) {
            if (groups[i] == groupID) {
                return true;
            }
        }

        return false;
    },
    // current user is the owner of the file
    is: (id, ownerID) => {
        if (ownerID && id == ownerID) {
            return true;
        }

        return false;
    },
    exec: (lvl) => {
        if (lvl == OCTAL.EXECUTE || lvl == OCTAL.EXECUTE+OCTAL.WRITE || lvl == OCTAL.EXECUTE+OCTAL.READ || lvl == OCTAL.EXECUTE+OCTAL.READ+OCTAL.WRITE) {
            return true;
        }

        return false;
    },
    read: (lvl) => {
        if (lvl == OCTAL.READ || lvl == OCTAL.READ+OCTAL.WRITE || lvl == OCTAL.EXECUTE+OCTAL.READ || lvl == OCTAL.EXECUTE+OCTAL.READ+OCTAL.WRITE) {
            return true;
        }

        return false;
    },
    write: (lvl) => {
        if (lvl == OCTAL.WRITE || lvl == OCTAL.READ+OCTAL.WRITE || lvl == OCTAL.EXECUTE+OCTAL.WRITE || lvl == OCTAL.EXECUTE+OCTAL.READ+OCTAL.WRITE) {
            return true;
        }

        return false;
    },
    canRead: (userID, userGroups, permission) => {
        if (p.read(permission.p_other)) {
            return true;
        }

        if (p.read(permission.p_group) && p.belongs(userGroups, permission.group_id)) {
            return true;
        }

        if (p.read(permission.p_user) && p.is(userID, permission.owner_id)) {
            return true;
        }

        return false;
    },
    canWrite: (userID, userGroups, permission) => {
        if (p.write(permission.p_other)) {
            return true;
        }

        if (p.write(permission.p_group) && p.belongs(userGroups, permission.group_id)) {
            return true;
        }

        if (p.write(permission.p_user) && p.is(userID, permission.owner_id)) {
            return true;
        }

        return false;
    },
    canExec: (userID, userGroups, permission) => {
        if (p.exec(permission.p_other)) {
            return true;
        }

        if (p.exec(permission.p_group) && p.belongs(userGroups, permission.group_id)) {
            return true;
        }

        if (p.exec(permission.p_user) && p.is(userID, permission.owner_id)) {
            return true;
        }

        return false;
    },
};

module.exports = p;
