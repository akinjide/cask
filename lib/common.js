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
                    return callback('ERR_EMPTY');
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
                    return callback('ERR_EMPTY');
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
            fs.writeFile(wd, pwd, callback);
        }
    },
    path: {
        resolve: (selectedPaths, cwd) => {
            const pathMatrix = [];
            let currentPaths = selectedPaths;

            if (!currentPaths || currentPaths.length == 0) {
                currentPaths = [cwd];
            }

            for (let i = currentPaths.length - 1; i >= 0; i--) {
                const base = cwd.split('/');
                let paths = currentPaths[i].split('/');

                pathMatrix[i] = [];

                if (paths.length == 1 ) {
                    base.push(...paths);
                    paths = base;
                }

                if (paths[0] == '') {
                    paths = paths.slice(1);
                }

                for (let j = paths.length - 1; j >= 0; j--) {
                    pathMatrix[i][j] = paths[j];
                }
            }

            return pathMatrix;
        },
        isFile: (name) => {
            const [filename, filetype] = name.split('.');

            if (filetype && filename) {
                return true;
            }

            return false;
        },
        isDir: (name) => {
            const [filename, filetype] = name.split('.');

            if (!filetype && filename) {
                return true;
            }

            return false;
        },
    }
};
