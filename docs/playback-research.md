# Playback research

## NouTube

Reviewed again on 2026-11-09: [nonbili/NouTube](https://github.com/nonbili/NouTube). Its README advertises ad-free and background playback for its Android, iOS, desktop and browser-extension implementations. The documented mechanism wraps YouTube and YouTube Music in a WebView, injects code and hooks playback controls.

The [content interceptor](https://github.com/nonbili/NouTube/blob/main/content/intercept.ts) handles initial player data and fetched responses; the [response transforms](https://github.com/nonbili/NouTube/blob/main/lib/intercept.ts) remove advertising fields. The [iOS WebView implementation](https://github.com/nonbili/NouTube/blob/main/modules/nou-tube-view/ios/NouTubeView.swift) injects scripts at document start. Desktop interception uses Electron session APIs, while the extension requests permissions on YouTube domains.

This is useful reference material for a potential native client or browser extension. A normal Echo webpage cannot acquire those privileges by hiding a cross-origin YouTube iframe. NouTube does not expose a documented public audio-source API that Echo can use instead of its current transport. Its ad-free claim has not been independently verified on an actual iPhone in this work.

The reviewed README blob was `74a92e9fd28d2c3869583116dac53e0006b720ea`; the interceptor blob was `be3f9a49ff189f51d30d6ada9f5db2af17f63900`. These match the previous review. No NouTube source was copied into Echo, no private service was accessed and Echo's license was not changed. NouTube declares AGPL-3.0.

## Current source experiment

The separate `feature/audio-only` branch and [draft PR](https://github.com/Jianming0718/echo-music/pull/1) retain the native HTML audio prototype and Netlify diagnostics. Ten hosted tests across five fixed client profiles and two songs failed before obtaining real audio. That experiment has not replaced the production player. Its full evidence is in the branch's `docs/audio-only-netlify.md` and `docs/audio-probe-results-2026-11-09.json`.
