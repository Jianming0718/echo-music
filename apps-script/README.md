# Echo Apps Script version 3

Version 3 adds a complete Google Sheets account/data backend. The published website continues using Supabase until the cutover is explicitly completed. The existing administrator account has been enabled in Supabase and marked `admin` in the private Users sheet. Imported data is a staged snapshot, not yet the live database.

Private management sheet: https://docs.google.com/spreadsheets/d/1mn55LJ8osh3hMM9SANLTb3OgT8iNCtQt8vaSsuiqZ0U/edit

Existing web app: https://script.google.com/macros/s/AKfycbzyabVdmmaYivsQ-ji_vHVVz6EzSxMG8wFKjj5WGW4TX7SvKkNb34HTuRktlNyo1jIdNg/exec

## Update the existing script now

1. Open the private sheet → Extensions → Apps Script. Replace the entire existing **Code.gs** with the complete **Code.gs** from this package. This file already includes the password library and all service modules. Keep the existing **Config.gs**, manifest and Script Properties. Do not add separate copies of the files under `src` or `vendor` to the Apps Script editor.
2. Run **installEchoSheets** once and grant the requested Google permissions. It preserves existing rows and role/status/membership controls, creates any missing data tabs and private password pepper, and checks the existing private avatar connection. It sends no email. Leave `ECHO_DATA_MODE` as **staged**.
3. Deploy → Manage deployments → Edit the original web app → New version → Deploy. Continue executing as yourself with access set to Anyone. Keep the same `/exec` URL.
4. Reply **已更新版本 3**. The health endpoint must report version 3 with `schemaReady`, `passwordReady` and `avatarReady` true, and mode `staged`.

The current Google connector cannot edit or publish an Apps Script project. Updating the Drive ZIP does not update the running web app. Publishing this code requires the steps above.

## Final cutover, after the script is verified

The operator must freeze legacy account-data writes, take a fresh snapshot and reconcile every record and original user ID with the private Sheets copy. The `Migration` tab records snapshot time and cutover state. Do not activate the staged snapshot while the old app is still accepting writes; otherwise recent changes could be lost or users could write into two different databases.

After the final verified import, run **activateEchoSheets**. Publish the frontend with `accountBackend: "sheets"` and the existing `appsScriptUrl`; the shipped frontend adapter is ready. Existing users select Forgot password and create a new password via email. No old passwords are exported and no reset email is sent automatically during migration. Their original IDs retain their profiles, likes, playlists, friendships and chats. Old sessions are not imported.

The next verification must exercise real browser CORS, the Apps Script password runtime, delivery to a requested mailbox, two-account access isolation and avatar upload/signing. Local tests cannot establish Google deployment permissions or mail delivery. Keep the legacy source intact until these checks pass. The Supabase project currently also serves music-search/artist functions; moving account data does not relocate those functions or remove avatar storage. Do not delete or pause the project.

After cutover, disable the legacy status edit trigger: the new API reads status, tier, expiry and role directly from Sheets. The version 3 trigger already exits in Sheets mode. Editing those cells does not require a separate database synchronization.

## Sheets schema

- **Users**: user_id, email, display_name, handle, avatar_path, account_status, tier, premium_until, created_at, synced_at, **role** (`member` or `admin`). Regular profile updates never write status/tier/expiry/role cells. Only the operator edits those controls in the private sheet.
- **Auth**: original user ID/email, bcrypt password hash, verification flag, password-change timestamp, failed-attempt and mail-throttle controls. Imported password hashes are intentionally blank until the user resets their password. Do not paste passwords or Supabase password hashes here.
- **Sessions**: hashed bearer tokens and expiry. Raw tokens are returned only to the signed-in browser and are never stored in the sheet.
- **Recovery**: hashed, expiring, single-use verification/reset tokens. Raw tokens appear only in the requested email link. No passwords are mailed.
- **Likes**: owner ID, track ID and track JSON. Audio files are not copied.
- **Playlists**: owner ID, title, visibility, artwork, dates and a JSON items cell. Putting items in the same row keeps playlist replacement to one Sheets write. A playlist is limited to 500 tracks and 43,000 characters of items JSON per row; the Sheets cell limit is finite.
- **Friendships**: pending or accepted requests. Only the recipient accepts a request.
- **Messages**: sender/recipient, text, optional track JSON and date. Only current confirmed friends can read or send messages. Retrying the same message ID does not duplicate it.
- **Migration**: snapshot and cutover status. It contains no credentials.

Existing EmailTemplates, Events and Setup tabs are preserved. The entire workbook must remain private. Do not publish it or share it with listeners: authenticated API responses expose only the requesting user's permitted records. Chats are not end-to-end encrypted and the operator can access the private workbook.

## Passwords and email

Passwords are HMAC-SHA256 prehashed with a private Script Property and bcrypt-hashed at cost 12 using the pinned bcryptjs 3.0.3 library. This supports long Unicode passwords without bcrypt's 72-byte truncation. New passwords require 12–256 characters. There are no plaintext password columns.

Preserve `ECHO_PASSWORD_PEPPER` privately: losing it requires users to reset their passwords. Do not put it in Sheets, GitHub or chat. Sessions last seven days; password changes invalidate other sessions and reset links invalidate all old sessions. Session validation also checks the password-change timestamp, so a partial cleanup cannot keep an old session valid.

Registration requires email verification. Reset links expire after 30 minutes and work once. Request responses do not confirm whether an email is registered. Mail and sign-in attempts are throttled; Google quotas still apply. Free personal Apps Script accounts have finite sending and execution quotas and are suitable for a small personal service, not unlimited usage.

EmailTemplates includes **verify_email** and **reset_password**. Enable a template to customize subject, HTML and reply address. `{{action_url}}` inserts the generated verified link and `{{email}}` inserts the escaped account email. Disabled custom templates use the built-in authentication email; they do not disable password recovery. Welcome emails retain the existing separate explicit-send workflow. No real email was sent during implementation.

## Avatars and hosting

Photos remain in the private Supabase `echo-avatars` bucket. Apps Script authenticates and authorizes each upload/copy/sign request, then calls the server-only `avatar-storage` function using the **existing** `ECHO_ADMIN_HOOK_KEY`. The private Supabase service key stays in Edge Functions; it is never copied into Apps Script, Sheets or the browser. No new secret needs to be pasted in chat.

An administrator can change profile names/handles or copy an existing photo into the target user's folder. The source user's photo is preserved. Normal users cannot assign roles or premium status. Account deletion cleans the user's avatar prefix and their Sheets records; the last administrator cannot delete themselves before another administrator is assigned. Legacy archived records require separate retention/deletion handling after cutover verification.

GitHub Pages remains the static frontend host. Local files remain on the device. This migration changes account/data storage; it does not grant rights to music or change YouTube playback behavior.

## Reproduce

From the source checkout, run `npm ci`, then `npm run apps-script:build`. This produces the complete `apps-script/Code.gs` from `src` and the pinned password dependency. The synchronous bcrypt bundle includes a GAS runtime shim and does not require Node crypto, browser timers or Web Crypto. MIT license for bcryptjs is in `vendor/BCRYPT-LICENSE.txt`.
