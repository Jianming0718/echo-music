# Echo

Minimal, responsive music player. Version 0.5.1 restores the previous YouTube Music search and playback engine, while keeping its video surface outside the visible layout. Password, avatar, Apps Script, membership, friends, and chat features from 0.5.0 are retained. Native audio still supports Audius streams, included licensed tracks, and files imported on the device.

- Website: https://jianming0718.github.io/echo-music/
- Source: https://github.com/Jianming0718/echo-music
- Private admin sheet: https://docs.google.com/spreadsheets/d/1mn55LJ8osh3hMM9SANLTb3OgT8iNCtQt8vaSsuiqZ0U/edit

## Music and interface

Music, Search, and Library are the three mobile navigation entries. Favorites, playlists, and friends live in Library. The player supports queue editing, shuffle, repeat, seek, sleep timer, session restoration, Media Session controls, synchronized lyrics, LRC import, and lyric timing adjustment.

The floating video dock and its now-playing video slot are removed. A single real YouTube iframe remains in an offscreen, inert, aria-hidden engine container; deleting that iframe would stop playback. The existing buttons control it through the player API, without simulated clicks or a fake playing state. Saved YouTube entries and song-sharing cards are playable again. Browser autoplay denial presents a retry and external YouTube link. Some devices require a direct interaction inside a visible video; hidden playback cannot satisfy that restriction. Background and lock-screen playback remain subject to browser, YouTube, and OS behavior. Closing the browser tab ends webpage playback.

Audius search filters out gated and unavailable recordings. This catalog differs from YouTube Music and does not guarantee every commercial song. Live verification returned audio/mpeg with a successful partial-content stream response. Real iPhone/Android listening and lock-screen behavior still require device verification. Included Scott Buckley tracks can play independently of the online catalog.

## Accounts and profile photos

Supabase Auth handles email registration, sign-in, password changes, and password-reset links. The change-password form sends the current password to the Auth API; new-password and recovery forms require confirmation. Passwords are never copied to Google Sheets. No real password was changed and no authentication email was sent during implementation.

Profile photos are center-cropped and re-encoded to 512×512 JPEG before upload. The private `echo-avatars` bucket allows JPEG files up to 1 MiB. Storage and profile policies enforce owner paths; signed-in users can obtain temporary URLs for current profile photos. Replaced photos are removed. Account deletion first removes owned photos, then uses an account-ID guard to prevent a changed session from deleting another account.

Email delivery requires Supabase SMTP and allowed callback URLs. Use the Pages URL, including `/echo-music/`, and add the retained Sites URL when using that deployment.

- https://supabase.com/dashboard/project/blzeipqcocynqvsgvgtb/auth/url-configuration
- https://supabase.com/dashboard/project/blzeipqcocynqvsgvgtb/auth/smtp

## Google Apps Script and Sheets

The private admin sheet has Users, EmailTemplates, Events, and Setup tabs. An initial snapshot of existing account metadata was copied into Users. The owner-provided Apps Script web app is published and its health endpoint reports configured: true.

The deployable script is in [apps-script/](apps-script/README.md). The account-admin Edge Function is deployed and authenticates users itself. The deployed bridge uses the owner-provided Apps Script URL, with `ECHO_APPS_SCRIPT_URL` available as a server-side override. Authentication and row isolation have automated tests; a real signed-in user should refresh Account details to verify the first live end-to-end sync.

Complete the setup in the Apps Script README: publish the web app, set `ECHO_APPS_SCRIPT_URL` in Supabase Edge Function Secrets, securely copy the generated `ECHO_ADMIN_HOOK_KEY` into the matching Supabase secret, and install the edit trigger. Never put the admin key in the browser, Sheet cells, chat, or GitHub.

Users cannot self-grant Premium or change their account status. Inactive accounts are restricted by database RLS. Expired Premium is treated as free. Membership is an Echo account flag; no checkout or paid feature is invented. Notification emails use disabled-by-default templates and an explicit owner action. Authentication emails continue through Supabase Auth.

The owner completed Google deployment because the available connector cannot publish Apps Script. Admin edits additionally require the matching private hook key and installed edit trigger. The prepared private setup package is also available at https://drive.google.com/file/d/1A4IvlGQENgKVpCxwhYr2GYuWUDuF75Zv/view .

## Friends

Accepted friends can send text and playable song cards, load earlier messages, and retry failed sends with the same message ID. Chats poll while open and visible; drafts stay in memory. Message text is escaped and arbitrary audio URLs are not accepted through song cards. Removing a friendship revokes access; account deletion cascades its conversations. Chat is not end-to-end encrypted.

## Run and verify

Use Node.js 24 for development. `npm ci`, then `npm test` runs playback, PostgreSQL permissions, avatar/account rules, Apps Script, account-bridge, UI, chat, password/photo, and cache regression tests. Database tests use local PGlite and do not change production data.

Serve the app with `python -m http.server 8000 --directory dist`. The static output is already present. `npm run config` writes public browser configuration. `npm run vendor` rebuilds the pinned official Supabase SDK. Only publishable or legacy anon keys belong in browser configuration; service-role and admin-hook secrets remain server-side.

The current environment has no available browser-control tool. DOM and media behavior tests use controlled models; actual email delivery, authenticated Sheets synchronization, device UI, and live embedded playback require verification. Apps Script deployment version 2 was confirmed using its health endpoint.

## Deploy

GitHub Pages publishes `dist` from main using `.github/workflows/pages.yml`. Public Supabase variables can override the committed public configuration. The static site works under a repository path; the service worker and versioned assets preserve local user data while updating code.

Supabase Free project: `blzeipqcocynqvsgvgtb`, region `us-east-1`. Apply the SQL files in `supabase/migrations/` in order. Their contents match applied hosted migrations. Functions are in `supabase/functions/`. The `youtube-search` Edge Function is restored with result parsing, request validation, caching, and pagination. The browser calls it with the public project key; no private Google API key is required.

Free services have quotas; no paid plan was enabled. Supabase's existing leaked-password-protection notice remains: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## License

Echo code is MIT, see LICENSE. Third-party media and SDK retain their licenses. Included Sanctuary, Hiraeth, Childhood, and Moonlight are by Scott Buckley, https://www.scottbuckley.com.au, CC BY 4.0, https://creativecommons.org/licenses/by/4.0/. Audio is encoded at 128 kbps. Photos are from Unsplash; Inter uses the SIL Open Font License. Software licenses are in `dist/vendor/`.

Echo is independent of Audius, Google, Supabase, Spotify, Apple, and NetEase. Uploaded IPA binaries and subscription bypass code are not part of the project.
