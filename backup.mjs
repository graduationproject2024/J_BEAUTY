import {DatabaseSync,backup} from 'node:sqlite';
import {resolve,dirname} from 'node:path';
import {mkdirSync,existsSync} from 'node:fs';
const source=resolve(process.env.DB_PATH||'data/jspa.sqlite');
const destination=process.argv[2];
if(!destination){console.error('Usage: node backup.mjs <new-backup-file.sqlite>');process.exit(1)}
const target=resolve(destination);
if(!existsSync(source)){console.error(`Database does not exist: ${source}. Set DB_PATH to the operational database.`);process.exit(1)}
if(source===target||existsSync(target)){console.error('Choose a new destination; backup never overwrites an existing file.');process.exit(1)}
mkdirSync(dirname(target),{recursive:true});
const db=new DatabaseSync(source,{readOnly:true});
try{await backup(db,target);const check=new DatabaseSync(target,{readOnly:true});try{const row=check.prepare('PRAGMA integrity_check').get();if(Object.values(row)[0]!=='ok')throw Error('Backup integrity check failed');}finally{check.close()}console.log(`Verified SQLite snapshot saved: ${target}`)}finally{db.close()}
