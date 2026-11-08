# Echo

Minimal, responsive music player. Version 0.10.0 keeps the YouTube Music search and playback engine with its video surface outside the visible layout, adds high-resolution responsive artwork, and supports Chinese and English in Settings. Password, avatar, Apps Script, membership, friends, and chat features from 0.5.0 are retained. Native audio still supports Audius streams, included licensed tracks, and files imported on the device. The optional Safari ad-helper script requires installing and authorizing the free Userscripts extension; actual ad skipping still needs verification on an iPhone. Settings now support light/dark themes and an opt-in animated background. Official Lucide icons, synchronized now-playing volume, artist profiles, album/single browsing, and verified release-date precision are included.

The compact page toolbar, optional server-authorized user editor, and Safari helper 0.2.0 update are documented in [Administration and ad helper](docs/admin-and-ad-helper.md).

Accounts, password authentication, favorites, playlists, friends and chat now use [Apps Script version 3 and private Google Sheets](apps-script/README.md). Original account IDs are retained; existing users set a new password by email. Legacy account access is frozen; private avatar storage and music-search functions stay on Supabase.

Original theme logos are in [dist/assets/brand](dist/assets/brand); artist and release details now use full pages with Back navigation. Email templates in [emails](emails) use the original logos and the requested support contact.
