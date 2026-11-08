# Appearance, player controls, and artist information

Echo 0.7.0 retains the existing playback engine, Safari ad helper, accounts, friendships, and chats.

## Appearance

Settings offers Dark and Light themes; Dark is the initial default. The choice stays on the device and applies before the initial render, including the privacy page and mobile browser theme color. Switching themes does not rebuild the player or reset form values.

Animated background is an experimental option, off by default. It uses moving gradients in the now-playing view, sampling cover colors when the image can be read through CORS. A deterministic local palette is used otherwise. Sampling is bounded to a 24×24 canvas and cached; stale image loads cannot overwrite a newer track. Animation pauses when playback pauses, the document is hidden, or the OS requests reduced motion. Closing now-playing stops the animation; disabling it cancels sampling. No audio or image file is uploaded for palette selection.

UI icons use the official Lucide SVG paths. Original assets and the upstream license are in `dist/vendor/lucide/`; the settings gear is no longer a custom path.

Scrollbars are hidden through Firefox and WebKit scrollbar styling. Overflow scrolling remains enabled, including settings, account details, artist biographies, and short viewports.

## Volume

Now-playing includes a volume slider beneath its seek timeline. It uses the existing media transport and stays synchronized with settings and mini-player volume, mute, and the saved unmuted level. Native device restrictions can still affect software volume; actual iPhone hardware volume behavior has not been verified in this environment.

## Artist and release information

The artist name in now-playing and song rows opens a modal with provider-supplied biography, artwork, albums, and singles/EPs. Album cards open their track lists; Play all uses the existing queue and playback engine. Opening, navigating, and closing these views does not stop current playback. Late responses cannot reopen a dismissed modal or replace another panel.

The `music-profile` Supabase Edge Function reads YouTube Music browse data. It verifies the public project key and allowed origins, accepts only bounded artist/release inputs, uses fixed upstream destinations, caches public metadata, and limits requests. There is no new account table or paid service.

Dates describe release records, not recording dates or video upload timestamps. YouTube year-only records stay year-only. A full date is added only when iTunes artist, song, and collection records identify a unique matching release date; conflicting candidates or a different edition year keep the provider year. Localized names can be matched through provider-supplied parenthetical aliases. Dates are formatted in the interface language using UTC to avoid shifting the calendar date.

Missing artist biographies, missing release dates, and temporarily unavailable catalogs are reported explicitly. No biographies, artwork, release days, or upload dates are invented. Existing shared-song messages keep their previous database schema; recipients can look up artist metadata from the song name and artist.

Live validation returned Jin's biography, five albums, ten singles/EPs, and playable video IDs for release tracks. Echo was matched to a 2025-05-16 release date. The provider's original year precision remains available if exact matching is unavailable.

## Validation limits

Automated tests cover stored theme choices, motion visibility and reduced-motion behavior, stale artwork sampling, synchronized volume, official icon provenance, scroll retention, profile and release navigation, date precision, request validation, caching, and preservation of playback and private account features. Live metadata requests were verified. Browser-control tooling and a physical iPhone are unavailable in the current environment, so visual layout, device playback restrictions, and actual iPhone volume need device verification.

## 0.11.1 contrast and membership update

Light-theme selected titles and active player buttons override the original dark-theme accent rules. Secondary text uses a darker neutral; chat, song cards, profile notices and lyrics have explicit light-theme colors. Regression checks measure computed text/background contrast for the selected row, metadata, controls, settings and Premium card.

The optional animated background uses a more varied sampled palette, faster 12/17-second gradient cycles, stronger color opacity and wider movement. A foreground veil keeps text readable. Cover sampling selects visibly different color buckets and derives complementary accents for nearly monochrome art. Existing opt-in, pause, visibility and reduced-motion behavior remains.

Account membership appears in a separate bordered card in both themes. A valid backend premium_until timestamp is shown with the browser’s local time zone and interface language. Missing or invalid expiry is explicit, and an expired timestamp is marked expired without changing the entitlement object or granting permissions. Refresh account data updates the card while an unrelated open panel is preserved. No account data, membership dates or Apps Script code were changed.
