# Echo

Minimal, responsive music player. Version 0.15.0 keeps the YouTube Music search and playback engine with its video surface outside the visible layout, adds high-resolution responsive artwork, and supports Chinese and English in Settings. Password, avatar, Apps Script, membership, friends, and chat features from 0.5.0 are retained. Native audio still supports Audius streams, included licensed tracks, and files imported on the device. The optional Safari ad-helper script requires installing and authorizing the free Userscripts extension; actual ad skipping still needs verification on an iPhone. Settings now support light/dark themes and an opt-in animated background. Official Lucide icons, synchronized now-playing volume, artist profiles, album/single browsing, and verified release-date precision are included.

The compact page toolbar, optional server-authorized user editor, and Safari helper 0.2.0 update are documented in [Administration and ad helper](docs/admin-and-ad-helper.md).

Accounts, password authentication, favorites, playlists, friends and chat now use [Apps Script and private Google Sheets](apps-script/README.md). Original account IDs are retained; existing users set a new password by email. Legacy account access is frozen; private avatar storage and music-search functions stay on Supabase.

Original theme logos are in [dist/assets/brand](dist/assets/brand); artist and release details now use full pages with Back navigation. Email templates in [emails](emails) use the original logos and the requested support contact.

Version 0.11.0 adds the owner-provided favicon, friends-only music activity with likes/comments, timed song comments, invited listening rooms, independent social switches, and mobile keyboard/scrubbing/navigation fixes. New social features require upgrading the existing Apps Script deployment to version 4; see [upgrade steps](apps-script/README.md) and [social/mobile notes](docs/social-and-mobile.md).

Version 0.11.1 fixes light-theme selected-song contrast, strengthens the optional cover-colored animation, and shows membership in a bordered card with the server expiration date (or an explicit missing-date state). No Apps Script update is required for these display changes.

Version 0.12.0 preserves the complete provider biography, removes release-page footer links, expands member administration and adds Premium redemption (single-use or shared codes). New account features require upgrading the same Apps Script deployment to version 5; follow [the upgrade instructions](apps-script/README.md). The artist metadata service has been updated independently; music playback and the existing account backend remain unchanged.

Version 0.13.0 gives account and redemption actions a centered processing/result screen with explicit acknowledgement and safe retry. Member and code management now share a protected full-page Administration view with browser navigation. These are frontend changes; the active Apps Script version 5 remains unchanged.

### 0.14.0

The account pill now uses fixed avatar dimensions and balanced spacing. Member administration separates identity, membership and edit controls, with responsive layouts and a structured editor. Music search inputs use a neutral container border on focus without an inner outline.

Sheets sign-in, session restoration and manual refresh retrieve profile, account and administrator status together through the existing authenticated `auth.session` action. Concurrent identity refreshes share an in-flight request for the same session; later refreshes contact the server again. Dynamic translation scans newly inserted content rather than rewalking its existing siblings. No Apps Script redeployment is needed for this release.

### 0.15.0

Square is a separate daily-life feed, with text-only or photo posts, optional music attachments, likes and comments. Each post has an explicit Friends only / All users audience; All users means active signed-in accounts. Browse Square, Friends or Mine without losing the composer draft. Previous posts retain friends-only visibility. About Echo and the two artist-page footer links have been removed.

The public-audience and photo features require [the focused Apps Script version 6 upgrade](apps-script/README.md#square-upgrade-version-6). Existing version 5 deployments continue to accept friends-only text posts; public/photo controls stay disabled until the server advertises support. This release does not migrate accounts or alter the existing password/session configuration. See [Square behavior and storage](docs/square.md).
