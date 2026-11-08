# Echo Apps Script version 4

The website uses private Google Sheets for accounts and social data. Version 4 adds friends-only music posts, likes, comments, timed song comments, and invitation-only listening rooms. Production remains on version 3 until the owner updates the existing deployment. The website reports this clearly; existing login, music and private chat remain usable while upgrading.

Private management sheet: https://docs.google.com/spreadsheets/d/1mn55LJ8osh3hMM9SANLTb3OgT8iNCtQt8vaSsuiqZ0U/edit

Existing web app: https://script.google.com/macros/s/AKfycbzyabVdmmaYivsQ-ji_vHVVz6EzSxMG8wFKjj5WGW4TX7SvKkNb34HTuRktlNyo1jIdNg/exec

## Upgrade the current project from version 3

1. Open the existing Apps Script project. Replace the entire **Code.gs** with the complete **Code.gs** from this package. Do not add the separate source modules to the editor. Keep **Config.gs**, the manifest, all Script Properties, and the existing deployment URL.
2. Select **installEchoSheets** and click **Run**. This adds six missing tabs: Posts, PostComments, PostReactions, Danmaku, Rooms, and RoomMessages. It preserves existing account records, passwords, administrator roles, membership/status columns, the private password pepper, and `ECHO_DATA_MODE=sheets`. It sends no email. Do not set the mode back to staged, and do not import old migration snapshots.
3. **Deploy → Manage deployments → Edit the original Web app → New version → Deploy.** Keep Execute as yourself and access Anyone. The URL must remain the same `/exec` URL.
4. Open the `/exec` URL. Verify `version: "4"`, `mode: "sheets"`, and `schemaReady`, `passwordReady`, `avatarReady` all true. Capabilities should include feed, danmaku and rooms. Refresh Echo and open Friends.

中文：用本安装包完整 Code.gs 替换原文件；运行 installEchoSheets；在原部署中选择「新版本」发布。Config.gs、脚本属性、部署 URL 和现有资料保持原样。无需再次迁移账号或运行 activateEchoSheets。

The current Google connector cannot edit or publish an Apps Script project. Updating this Drive ZIP does not update the running Web app.

## Social behavior and limits

- Music posts, reactions, comments and timed song comments are visible only to the author and their current confirmed friends. Removing a friendship revokes access on the next request. Private account email, roles, session tokens and password hashes are never included in social profiles.
- A post author can remove comments on their own post; users can delete their own posts, comments and timed comments. Administrators can delete inappropriate content through the authenticated APIs.
- Rooms require confirmed friends explicitly selected by the host, up to 12 invitees. Only the host can publish playback state; a revision number rejects stale writes. Room access is checked on every request. Each device streams independently from its own provider. A participant must tap Start following to allow playback. Local audio files are not uploaded or broadcast. Provider advertising, regional availability, browser autoplay rules, buffering and network latency can cause differences between devices.
- Visible rooms poll about every 10 seconds; this is periodic synchronization, not a WebSocket service or guaranteed sample-accurate playback. The host publishes play/pause and track changes sooner when possible. Hiding the page pauses polling. Turning off rooms immediately stops following; it does not pause standalone music.
- Rooms expire after 24 hours. Ending a room immediately removes its chat; expired rooms and their messages are removed when another room is created. Room messages are capped at the latest 200; the interface reads the latest 40. Posts and comments use keyset pagination. Timed song comments load the latest 150 per song and animate only around their playback timestamp. Reduced-motion mode keeps the readable list without animated overlays.
- Per-account limits: 200 posts, 1000 post comments, 2000 post reactions, and 500 timed comments. Social writes and room creation are throttled. These limits keep the free Sheets backend suitable for a small service. Apps Script has execution quotas and Sheets is not an unlimited social-network database.
- Settings provide independent switches for Music feed, Song comments, Listening rooms and Friend chat. Preferences are local to the device. Turning a feature off stops its UI/refresh/following; existing content remains until its owner deletes it. Interaction drafts stay in page memory and are not written to localStorage.
- Account deletion removes owned posts and dependent comments/reactions, the user's other comments/reactions/timed messages, owned rooms/chat and other room memberships/messages. The last administrator remains protected from accidental deletion.

## Final cutover, after the script is verified

The operator must freeze legacy account-data writes, take a fresh snapshot and reconcile every record and original user ID with the private Sheets copy. The `Migration` tab records snapshot time and cutover state. Do not activate the staged snapshot while the old app is still accepting writes; otherwise recent changes could be lost or users could write into two different databases.

After the final verified import, run **activateEchoSheets**. Publish the frontend with `accountBackend: "sheets"` and the existing `appsScriptUrl`; the shipped frontend adapter is ready. Existing users select Forgot password and create a new password via email. No old passwords are exported and no reset email is sent automatically during migration. Their original IDs retain their profiles, likes, playlists, friendships and chats. Old sessions are not imported.

Production verification checks the HTTP/CORS responses and temporary-account data isolation, friends/chat, and avatar upload/signing. Actual sign-in and reset email delivery still require a user to request a reset and complete it in their browser. Local tests cannot establish Google deployment permissions or mail delivery. Keep the legacy source intact until these checks pass. The Supabase project currently also serves music-search/artist functions; moving account data does not relocate those functions or remove avatar storage. Do not delete or pause the project.

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

## Legacy access freeze

Migration `echo_sheets_cutover_guard` adds a private operator-controlled state and starts open for a safe schema deployment. The verified cutover then sets `legacy_open=false`. Restrictive SELECT policies hide archived account rows from legacy clients. Row triggers block both client and service-role mutations; the account-deletion helper also checks the guard. The private avatar bucket denies legacy authenticated access while the server-only storage role remains usable. Legacy `account-admin` and `admin-users` entrypoints return 410 with no account data. Their old handler implementations remain in source for an explicit rollback.

The state table intentionally has RLS enabled without listener policies or grants; only the operator and security-definer helpers access it. The corresponding informational Supabase advisor is expected. The existing Supabase Auth leaked-password-protection warning relates to the retired authentication service: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Rollback requires a deliberate frontend/backend coordination and restoration of the old Edge entrypoints as well as reopening the private state. Do not reopen the old store while clients write to Sheets. Archived records are retained pending new-service verification, and are not silently deleted.

## Branded email bodies

The live EmailTemplates rows use the complete HTML from the repository’s `emails` directory. Header images are the original theme wordmarks hosted on public GitHub Pages. The footer displays admin@echomusic.com and links to mailto:admin.echomusic@gmail.com; Reply-To uses the Gmail address. Subjects and enabled flags are preserved when updating template bodies. These live sheet edits apply immediately; no Apps Script deployment or real test email is required for a branding update.
