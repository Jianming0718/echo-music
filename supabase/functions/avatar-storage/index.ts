import {createAvatarHandler} from './storage.mjs';
Deno.serve(createAvatarHandler({url:Deno.env.get('SUPABASE_URL')||'',serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',hookKey:Deno.env.get('ECHO_ADMIN_HOOK_KEY')||''}));
