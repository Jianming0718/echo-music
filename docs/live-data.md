# Background loading and live views

Version 0.16.0 is a frontend-only change and uses the existing version-6 Apps Script API. It does not add a timer, trigger or database write to the server.

## Warm navigation

The signed-in session keeps memory snapshots for friends, library, the main Square feed, and authorized administrator member/code lists. Initial preloads run sequentially with short gaps; inactive snapshots refresh at most about once a minute. Data is not downloaded for disabled Square features or unauthorized administrator tasks. Cached content is used before revalidation on later navigation. The first uncached visit still waits for the server, and a full reload clears this memory cache. A separate existing owner-specific offline library cache continues to work as before.

## Refresh behavior

Visible supported lists and expanded comment threads refresh on a roughly four-second cadence. Each task coalesces concurrent reads. The scheduler waits for prior work rather than accumulating overlapping polling cycles; long requests extend the cadence. Background preload fetches are bounded to one task per cycle. Loaded list pages are revalidated together so removed entries do not linger in a stale pagination tail. Closed comment threads do not poll. Identity is rechecked about every thirty seconds, or four seconds when the profile panel is visible. Existing chat and listening-room polls use four seconds with their existing in-flight guards.

Canonical comparisons ignore transient URL tokens and server timing fields. Unchanged responses do not replace content. Member/code/friend rows are keyed; Square retains cards and updates reaction counters in place. Open comment forms are retained, including drafts, request IDs and focus. When cards must move or change, the feed preserves a reading anchor where possible. No full-page refresh is used for polling.

Member snapshots may update while an editor is open, but the editor retains its original values/version. A conflicting server edit is rejected by the existing optimistic concurrency check; returning to the list applies the newer snapshot. Generated plaintext redemption codes remain solely in their original temporary panel and are never added to list caches.

## Lifecycle and failure handling

Hidden/offline pages pause automatic fetching; resuming the page restarts it. This works while the browser allows JavaScript execution and does not promise background execution after iOS suspends or closes a webpage. Network failures retain last-known content and back off to at most one attempt per minute. Manual refresh can retry immediately. Server authorization is required for every actual read and mutation; permission failures discard affected protected snapshots and administrator revocation closes the protected page.

Snapshots are isolated by user and session token and cleared on session changes. They are never stored in localStorage, IndexedDB, the service worker or the source archive. Successful mutations are never cached and invalidate related read snapshots; a delayed earlier read cannot overwrite a newer mutation. Photo URL tokens are reused for up to fifty minutes to avoid repeated image reloads, then renewed before their one-hour lifetime ends. Image paths and authorization still come from the server; caching does not extend a link’s expiry or bypass audience checks.

Automated tests cover coalescing, warm navigation before delayed responses, four-second scheduling, hidden/offline pausing, network backoff, role/session isolation, stale response rejection, unchanged DOM identities, reaction/comment updates, retained drafts/cursors, optimistic versions and permission revocation. Physical-device responsiveness still depends on browser, network and Apps Script latency.
