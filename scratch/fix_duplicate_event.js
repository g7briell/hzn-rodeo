const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://api.rodeoapp.pro';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwMTE3MzYwLCJleHAiOjIwOTU0NzczNjB9.ZknzukXlmPHPJRq7xEN-2jiUz3z0lFxF99Cj-RNUQAw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixDuplicate() {
    try {
        console.log("Fetching details of both EXPO RIOS events...");
        const { data: approvedEvent } = await supabase
            .from('eventos_oficiais')
            .select('*')
            .eq('id', 'b228b7f3-6bfb-4e80-9996-95519aaa7c30')
            .single();

        const { data: pendingEvent } = await supabase
            .from('eventos_oficiais')
            .select('*')
            .eq('id', '9b769196-f0f0-4626-aee0-0bdd74167f6a')
            .single();

        if (!approvedEvent || !pendingEvent) {
            console.log("Could not find both events.");
            return;
        }

        console.log("Copying details from pending event to approved event...");
        const { error: updateError } = await supabase
            .from('eventos_oficiais')
            .update({
                detalhes: pendingEvent.detalhes,
                created_at: new Date().toISOString() // Set timestamp
            })
            .eq('id', approvedEvent.id);

        if (updateError) throw updateError;
        console.log("Approved event updated successfully!");

        console.log("Deleting duplicate pending event...");
        const { error: deleteError } = await supabase
            .from('eventos_oficiais')
            .delete()
            .eq('id', pendingEvent.id);

        if (deleteError) throw deleteError;
        console.log("Duplicate pending event deleted successfully!");

    } catch (e) {
        console.error("Error fixing duplicate event:", e);
    }
}

fixDuplicate();
