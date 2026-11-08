# Echo 0.11.0

`assets/fav.png` is the unchanged 1000 × 1000 RGBA image from the owner’s fav.zip. The site icon, Apple touch icon and web-app manifest use it. The original theme wordmarks remain in the sidebar. The favicon is cached with the updated app shell.

Friends is available directly from the mobile bottom navigation. Music feed and listening rooms are full main views. Friend chat remains private. Each social feature can be disabled independently in Settings; data is not deleted by hiding a feature.

The active data backend remains Google Sheets. All new APIs are authenticated Apps Script actions, with server-side friendship checks, ownership checks, bounded content, idempotent client-generated IDs and rate limits. Private keys, email addresses and user data are excluded from the public source package. Complete backend behavior and upgrade steps are in apps-script/README.md.

Mobile fixes include visualViewport-aware keyboard layout, 16px form inputs to avoid iPhone focus zoom, reachable chat controls, 44px actions, touch scrolling, reduced-motion support, and less automatic keyboard activation during navigation. Delayed friend and playlist responses are checked against the current account, view and panel before touching the interface. Feed refreshes preserve expanded comment drafts; failed writes keep drafts and reuse their request ID.

Validation uses the actual Apps Script router in a mocked Sheets runtime and the actual webpage scripts in jsdom, alongside existing player/auth/appearance/security regressions. This environment has no supported browser-preview helper, so physical iPhone/Android layout and playback have not been verified. Provider playback and existing Safari extension behavior are unchanged by this update.

New social features need Apps Script version 4 deployed by the owner. A version 3 service produces a visible upgrade/retry message instead of fabricated content. Existing accounts, music playback and private chat remain on the existing backend until that upgrade.
