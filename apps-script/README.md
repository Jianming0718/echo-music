# Echo account admin setup

Current script source version: **2**. If you already published version 1, replace Code.gs with this version and edit the existing deployment to use a new version. Keep the same URL and Script Properties. Version 2 prevents profile synchronization from writing administrator-owned status and membership columns.

This package connects a private Google Sheet to Echo account management. Passwords and sessions remain in Supabase Auth. Photos remain in a private Supabase Storage bucket. The Sheet stores account identifiers, email, display name, avatar path, status, membership and expiry.

Admin sheet: https://docs.google.com/spreadsheets/d/1mn55LJ8osh3hMM9SANLTb3OgT8iNCtQt8vaSsuiqZ0U/edit

Current published web app (health endpoint verified): https://script.google.com/macros/s/AKfycbzyabVdmmaYivsQ-ji_vHVVz6EzSxMG8wFKjj5WGW4TX7SvKkNb34HTuRktlNyo1jIdNg/exec

## Publish or update the Apps Script

1. Open the admin sheet with your personal Gmail account. Choose Extensions → Apps Script.
2. Copy `Code.gs` and `Config.gs` into the project. Enable the manifest file in Project Settings, then copy `appsscript.json` into that manifest.
3. Run `configureEcho` once and approve Google's requested permissions. This stores the Sheet and public Supabase configuration in Script Properties and generates a private admin-hook key. It does not send email.
4. Deploy → New deployment → Web app. Execute as yourself and allow Anyone to access the web app. The endpoint authenticates each request with Supabase before reading or writing that user's row; it does not expose the user table through GET.
5. Copy the deployment URL ending in `/exec`. In Supabase → Edge Functions → Secrets, set `ECHO_APPS_SCRIPT_URL` to this URL.
6. In Apps Script → Project Settings → Script Properties, copy `ECHO_ADMIN_HOOK_KEY`. Set a Supabase Edge Functions secret with the same name and value. Do not paste this key in chat, put it in the spreadsheet, or commit it to GitHub.
7. Run `installEchoStatusTrigger` once. Manual edits to Users columns F–H will now update the server's account restrictions and membership. A missing or short admin key explicitly disables admin-hook requests.
8. Sign into Echo and click Account → Refresh account details. A successful sync fills or updates your own Users row. Check Events after changing an account status.

The Google connector available during implementation can create/edit Sheets and upload files, but cannot create or deploy an Apps Script project. The owner has published the web app and supplied its URL. The Echo bridge includes that URL as a fallback; the matching admin-hook secret and edit trigger are still required for pushing administrator edits.

## Sheet columns

- `user_id` is the Supabase Auth user ID; keep it unchanged.
- `email`, `display_name`, `handle`, `avatar_path` are refreshed from the authenticated account.
- `account_status`: `active`, `suspended`, or `disabled`. Inactive accounts are blocked from cloud data by database RLS.
- `tier`: `free` or `premium`. An expired `premium_until` is treated as free. An empty expiry means no scheduled expiry.
- `created_at`, `synced_at` are timestamps; no passwords, JWTs or image bytes are stored.

Premium is an Echo account flag. No paid feature or checkout is invented by this integration. Clients cannot write their own status or membership.

## Email templates

EmailTemplates contains a disabled welcome template. Edit the subject, HTML body and reply address. `{{display_name}}` is substituted with escaped text. To send a welcome email, enable the template, select a user row and use Echo 管理 → 向选中用户发送欢迎邮件. The script asks for confirmation before sending. No email is sent merely by syncing or editing an account.

Google's sending and execution quotas still apply: https://developers.google.com/apps-script/guides/services/quotas

Password-reset and signup-confirmation emails continue to use Supabase Auth. Configure its SMTP, Site URL and allowed redirects for `https://jianming0718.github.io/echo-music/`. Notification templates in this Sheet do not replace Supabase's authentication-email delivery.

- https://supabase.com/dashboard/project/blzeipqcocynqvsgvgtb/auth/url-configuration
- https://supabase.com/dashboard/project/blzeipqcocynqvsgvgtb/auth/smtp

## Verification

Test two accounts: profile changes sync to their own rows; browser requests cannot grant Premium; suspending an account blocks its cloud writes; reactivating restores access; avatar uploads cannot write another account's folder; password change requires the current password; reset links lead to a new-password form.

The script source and bridge have automated tests. No real account password has been changed and no email has been sent during implementation. Actual Google deployment and email delivery require owner setup and verification.
