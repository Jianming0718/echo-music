# Independent audio playback — test deployment only

The audio-only candidate is deployed at [the Netlify test site](https://echo-audio-test--music-echo.netlify.app/). **Real-song playback remains blocked by YouTube’s “Sign in to confirm you’re not a bot” response, including after anonymous attestation. The existing Echo production player has not been switched.** All source remains in the `feature/audio-only` GitHub branch. See [deployment evidence and limitations](docs/audio-only-netlify.md).

# Echo

Minimal, responsive music player. Version 0.17.1 keeps the YouTube Music search and playback engine with its video surface outside the visible layout, adds high-resolution responsive artwork, and supports Chinese and English in Settings. Password, avatar, Apps Script, membership, friends, and chat features from 0.5.0 are retained. Native audio still supports Audius streams, included licensed tracks, and files imported on the device. The optional Safari ad-helper script requires installing and authorizing the free Userscripts extension; actual ad skipping still needs verification on an iPhone. Settings now support light/dark themes and an opt-in animated background. Official Lucide icons, synchronized now-playing volume, artist profiles, album/single browsing, and verified release-date precision are included.

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

### 0.16.2

While a signed-in listener uses Echo, the app warms member/code lists (administrators only), friends, library and the main Square feed in memory. Opening a warmed page renders its last snapshot immediately and revalidates when stale. The visible lists and open comment threads check for changes approximately every four seconds without overlapping their own requests; slow responses extend the interval. Identity/role checks continue separately, with faster account-panel refreshes. No Apps Script update is required.

Unchanged responses preserve DOM nodes. Feed reactions update in place, comment forms retain drafts/focus, and member editing keeps the original optimistic version instead of overwriting a draft. Failed network requests retain cached content and back off. Hidden/offline pages pause refreshes and resume on return. Cache entries are scoped to the current user and session, never written to persistent storage; writes invalidate related snapshots, stale responses are rejected, and server permission failures discard protected records. See [live data behavior](docs/live-data.md).

### 0.17.0

Square now uses a compact social timeline based on the supplied layout reference: an avatar column on the left, aligned names/text/attachments on the right, small inline music cards, photos with their proportions preserved, and bottom-aligned timestamps, audience labels and actions. Thin separators replace the enclosing post cards. More options provide copy text, existing music/photo actions and authorized deletion. Existing themes, audience rules, comments and incremental updates are retained. No backend update is required.

### 0.17.1

Friends now relies on automatic updates without a manual refresh button. Joining a listening room immediately shows progress above the list and coalesces repeated clicks on the same room. Successful entry brings the room controls into view; failures show an inline message with retry. Cancelling, switching rooms, leaving the rooms tab or changing accounts rejects earlier results. Reopening the current room retains its chat draft. Invited guests still start playback explicitly with Follow. No Apps Script update is required.
