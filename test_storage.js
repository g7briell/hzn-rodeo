const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://scivakieachwewdhnuhv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTc3NzksImV4cCI6MjA5NDEzMzc3OX0.nwCC0FYPBsMGhuj7xJju9ubFD2GjKmlTLOptz0UFWfk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets, listError);

  const { data, error } = await supabase.storage.createBucket('downloads', { public: true });
  console.log('Create Bucket:', data, error);

  const { data: upData, error: upError } = await supabase.storage.from('downloads').upload('test.txt', 'hello', { upsert: true });
  console.log('Upload:', upData, upError);
}

testStorage();
