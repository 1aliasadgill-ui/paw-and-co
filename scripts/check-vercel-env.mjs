const required = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'BLOB_READ_WRITE_TOKEN'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) throw new Error('Connect persistent storage before deploying. Missing environment variables: ' + missing.join(', '));
if (!/^(libsql|https):\/\//.test(process.env.TURSO_DATABASE_URL)) throw new Error('Deployments must use a remote Turso database. Local SQLite files are only for development.');
console.log('Persistent database and image storage are configured.');
