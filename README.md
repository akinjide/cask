## Cask

### Prerequisite

- SQLite3
- Node.js
- Node Version Manager

### Setup

#### Create Migration and Seed

```bash
nvm use $(cat .nvmrc)
npm install

node ./bin/migrate --up
node ./bin/migrate --seed
```


#### Drop Migration

```bash
node ./bin/migrate --down
```


### References

- https://medium.com/dailyjs/how-to-use-npm-link-7375b6219557
- https://docs.npmjs.com/cli/v6/configuring-npm/package-json#bin
- https://codingshower.com/understanding-npm-package-json-bin-field/
