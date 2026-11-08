# User administration and Safari helper in Echo 0.8.0

## Compact header and lyrics

The active page title now shares the top toolbar with the account and settings buttons on desktop and mobile. The old heading is visually suppressed so search controls follow the toolbar without the previous extra row. Lyrics no longer display the LRCLIB footer link; data attribution remains in About and Privacy.

## Administrator access

The Supabase Table Editor error `profiles_avatar_owner` is a data constraint, not a lack of project-owner permissions. Every non-null photo path must start with the profile owner's UUID. Pasting another user's photo path into a profile is rejected even in the dashboard. The constraint and ordinary-user row policies remain in place.

A separate, server-checked `echo_admins` membership enables **Settings → Manage users**, also accessible from the account panel. This editor changes display names, handles and photos. Selecting an existing photo copies it through Supabase Storage to a new file in the target user's directory. Removing or replacing a photo affects only the target's previous file. The source user's photo is preserved. No real user profile was changed during deployment verification.

Memberships can be created or removed only by the operator through a trusted server/database action. The endpoint verifies a signed-in Supabase user, server-side membership and active account status on every request. It never trusts user metadata or browser flags for authorization. Public/anonymous clients cannot write memberships. Being an application administrator does not bypass the normal client profile policies: the dedicated authenticated endpoint performs administrative changes.

No email addresses, passwords, chats, likes or playlists are included in the user-management response. Account status, premium tier and membership expiry continue to use the existing private Google Sheet/Apps Script bridge. Editing those values in the database alone can be overwritten on the next bridge synchronization.

As of 0.9.0, the operator explicitly confirmed the account and its administrator membership is enabled. The same administrator role is recorded in the private Users sheet. No privileged credential is included in the frontend or source archive.

Existing Supabase advisory: leaked password protection is disabled. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Safari helper 0.2.0

Existing installations must update `echo-ad-skip.user.js` in Userscripts. Refreshing Echo updates the website but not the installed extension script. Enable extension access for Echo, youtube.com and youtube-nocookie.com, then refresh and play a track. iPhone Chrome cannot run Safari extensions.

The new script observes all player video elements and captures media events in addition to player mutations. It tries visible enabled skip controls and mutes/accelerates player-marked ads. It restores previous media rates after the ad and on disable/navigation. It does not seek through music, choose another song, or synthesize a playback gesture.

When a current helper is connected, Echo temporarily mutes its YouTube player before a playback request. A fresh, token-matched content signal releases the mute; pause, source changes, disable and disconnect cancel the gate. A 15-second startup fallback prevents an unknown player state leaving music permanently silent. A confirmed, connected ad keeps the mute active; an undetected ad can become audible after the unknown-state fallback. The user's zero-volume setting remains respected.

The versioned parent/frame handshake includes a random challenge, origin checks and a per-playback token. Safari messages whose isolated-world source is null require the current iframe's challenge. Legacy 0.1.0 installations are detected and prompted to update. Connected status confirms extension communication, not a successful ad skip.

Some ads still require waiting, playback-rate limits differ by device, and platform changes can break detection. Zero-delay, zero-ad playback is not guaranteed. Physical iPhone validation is still needed; automated DOM tests do not establish Safari extension behavior.

## Validation

The automated suite covers authorization rejection, server-only membership, profile row isolation, target-owned photo copies and write failures, administrator UI/session races, lyric footer removal, handshake spoofing, multi-video mute restoration, startup tokens and zero-volume handling. Production verification uses unauthenticated/rejected requests; no other person's profile is changed as a test.
