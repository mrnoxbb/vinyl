import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = authHeader.slice(7);

  // Verify the user's JWT to get their ID
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
  if (userError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Use service role to delete all user data and auth record
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Delete from public.users (CASCADE handles related tables)
  const { error: deleteError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', user.id);

  if (deleteError) {
    console.error('Failed to delete user data:', deleteError);
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Delete auth record
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (authDeleteError) {
    console.error('Failed to delete auth user:', authDeleteError);
    return new Response(JSON.stringify({ error: authDeleteError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
