const url = 'https://scivakieachwewdhnuhv.supabase.co/rest/v1/';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU1Nzc3OSwiZXhwIjoyMDk0MTMzNzc5fQ.TvSTk7fQjKqZM9T8Qx5aRkepE0OwsnmVR_qaP2yQ0VU';

async function run() {
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    const spec = await res.json();
    console.log('Tables in schema:');
    if (spec.definitions) {
      Object.keys(spec.definitions).forEach(tableName => {
        console.log(`\nTable: ${tableName}`);
        const props = spec.definitions[tableName].properties;
        if (props) {
          Object.keys(props).forEach(propName => {
            console.log(`  - ${propName}: ${props[propName].type} (${props[propName].format || ''})`);
          });
        }
      });
    } else {
      console.log('No definitions found. Full response:', spec);
    }
  } catch (err) {
    console.error('Error fetching PostgREST OpenAPI spec:', err);
  }
}

run();
