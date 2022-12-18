## Cask

Linux-like access control model and commands to interact with the model

### Implementations

- adduser ✅
- cat ✅
- chmod ✅
- chown ✅
- dir 🚫
- editor ✅
- find 🚫
- getfacl 🚫
- groupadd ✅
- ln 🚫
- ls ✅
- mkdir ✅
- ps 🚫
- rm ✅
- setfacl 🚫
- stat ✅
- su ✅
- sudo ✅
- touch ✅
- umask ✅
- usermod ✅

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

### Default Users

#### Root

Belongs to sudo, staff, root group and owns `/root`, `/home` folder

- username: root
- password: toor

#### Main

Belongs to sudo, staff, akinjide group and owns `/home/akinjide` folder

- username: akinjide
- password: groot


### Archive

```bash
# zip
zip -r cask.zip cask -x cask/node_modules/\* -x cask/.git/\*
unzip cask.zip

# tar
tar --exclude='cask/node_modules' --exclude-vcs -zcvf cask.tar.gz cask
tar xvf cask.tar.gz

# rar
rar a -r cask.rar cask -xcask/node_modules -xcask/.git
unrar x cask.rar
```
