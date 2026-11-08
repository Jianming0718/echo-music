function configureEcho(){
 const p=PropertiesService.getScriptProperties();
 p.setProperties({"ECHO_SHEET_ID": "1mn55LJ8osh3hMM9SANLTb3OgT8iNCtQt8vaSsuiqZ0U", "ECHO_SUPABASE_URL": "https://blzeipqcocynqvsgvgtb.supabase.co", "ECHO_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_GsTsFqG1s-sX3Y5Vy1OMyg_asjLk7ny"});
 if(!p.getProperty('ECHO_ADMIN_HOOK_KEY'))p.setProperty('ECHO_ADMIN_HOOK_KEY',Utilities.getUuid()+Utilities.getUuid());
}
