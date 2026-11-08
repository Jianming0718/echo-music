# Echo Safari Ad Helper

This optional userscript runs inside Echo's YouTube iframe through the Userscripts Safari extension. It tries available ad skip buttons and mutes and accelerates video while the player explicitly marks it as an advertisement. It never seeks, starts playback, pauses playback, or selects another song. It restores the previous muted state and playback rate after the ad or when disabled.

This is an experimental helper, not a verified guarantee of immediate or complete ad removal. Real iPhone/Safari behavior still needs testing. YouTube can change its DOM, ignore untrusted button clicks, prevent ad acceleration, or delay completion despite increased playback speed. Non-skippable ads can still require waiting.

## Install on iPhone

1. Install [Userscripts](https://apps.apple.com/app/userscripts/id1463298887). Its official [instructions](https://github.com/quoid/userscripts#usage) explain enabling the Safari extension. Apple's US lookup API returned a price of zero during this task.
2. Enable Userscripts in iPhone Settings under Safari extensions. Grant website access for the Echo site and its YouTube iframe domains, `www.youtube.com` and `www.youtube-nocookie.com`. Location of Safari settings varies by iOS version.
3. In Safari, open [the script](https://jianming0718.github.io/echo-music/echo-ad-skip.user.js). Open Safari's extensions menu and choose Userscripts to install it. Alternatively, save the `.user.js` file in the Userscripts directory selected in the app.
4. Refresh Echo. Settings → Safari ad skipping → Setup and status shows whether the helper has connected. Select a song to check actual playback.

This extension method works in Safari, not Chrome on iPhone. Installation and Safari permissions require action on the phone; a website cannot install or authorize an extension automatically.

## Scope and privacy

The script only matches YouTube embed pages. It stays inactive until its actual parent window, on an allowed Echo origin, acknowledges a per-frame nonce. The Echo page accepts messages only from the current player iframe and allowed YouTube origins. The script does not read account details, playlists, lyrics, or messages, and makes no network requests. There are no third-party dependencies or dynamic code evaluation in the script.

The helper can be disabled in the setup sheet. To remove it, disable or delete it in Userscripts, then refresh Echo.

## Other approaches tested

A separate `audio-resolve` prototype used pinned `youtubei.js@18.3.0` in the existing Supabase Free project. Live requests for The Astronaut and Dynamite using Android VR and iOS clients were rejected with HTTP 403. The logged upstream body was Google's "Sorry..." page. No playable audio URL was obtained, so the website never switched to that prototype. The experimental endpoint has been disabled and JWT protection restored; it returns a service-unavailable result to authorized calls and does not import the resolver library.

Earlier public Piped/Invidious checks also did not return playable audio. Those unavailable proxies were not installed in Echo as a fallback list.

## Validation

Controlled DOM tests verify normal-song protection, parent-origin and nonce checks, ad-only mute/speed changes, state restoration, disabled/hidden skip-button handling, Safari-style speed clamping, bridge source checks, and bilingual setup without resetting playback. They do not simulate Google ad delivery or prove ad removal on an actual iPhone.

Echo and this independently written helper use the repository's MIT license. Userscripts has its own license and remains a separate app.
