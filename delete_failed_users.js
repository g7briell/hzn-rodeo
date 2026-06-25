const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.your-tenant-id:Gabriel1479@37.148.134.227:5432/postgres' });
client.connect().then(() => 
  client.query("DELETE FROM auth.users WHERE email = 'g7briellrms@gmail.com'")
).then(res => {
  console.log('Deleted rows:', res.rowCount);
  client.end();
}).catch(console.error);
