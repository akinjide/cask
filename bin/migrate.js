#!/usr/bin/env node

const program = require('commander');

const db = require('../lib/db');

program
    .name('migrate')
    .description('migrate - setup execution environment')
    .option('-u, --up', 'create schema')
    .option('-d, --down', 'delete schema')
    .option('-s, --seed', 'populate root/sudo record')
    .action(({ up, down, seed }, cmd) => {
        if (!(up || down || seed)) {
            console.log('One of up, down or seed is required.');
            return;
        }

        if (up) {
            console.log('Migrating ...');
            return db.up(db.ctx, () =>{});
        }

        if (down) {
            console.log('Dropping ...');
            return db.down(db.ctx, () =>{});
        }

        if (seed) {
            console.log('Seeding ...');
            return db.seed(db.ctx, () =>{});
        }
    });

program.parse(process.argv);
