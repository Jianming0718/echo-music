import {createHandler} from './bridge.mjs';
Deno.serve(createHandler({
 url:Deno.env.get('SUPABASE_URL')||'',
 anonKey:Deno.env.get('SUPABASE_ANON_KEY')||'',
 serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',
 appsScriptUrl:Deno.env.get('ECHO_APPS_SCRIPT_URL')||'https://script.google.com/macros/s/AKfycbzyabVdmmaYivsQ-ji_vHVVz6EzSxMG8wFKjj5WGW4TX7SvKkNb34HTuRktlNyo1jIdNg/exec',
 hookKey:Deno.env.get('ECHO_ADMIN_HOOK_KEY')||''
}));
