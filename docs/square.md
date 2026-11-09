# Square

Square is reached from both the sidebar and the mobile navigation. It accepts everyday text, a single photo, and an optional currently-playing song. Publishing does not start or interrupt playback. There is no requirement to attach music.

## Compact composer and comments

The plus button opens an inline composer; it starts collapsed so browsing posts uses the available screen. Closing it preserves the current text, audience, photo and music attachment in memory. Publishing locks the toggle until the response finishes; failure leaves the draft open for retry, while success clears and closes it and announces Published. The button exposes its expanded state and labels in English and Chinese and moves keyboard focus to the text field or back to the toggle.

Existing post comments display automatically in a compact, theme-aware background with inline author, colon and escaped body text. The comment action toggles only the reply form; closing it retains its draft and leaves the comments visible. Times remain available to assistive technology. Existing audience authorization, pagination and delete permissions remain in place. Timed song comments and room chat keep their layouts.

Automatic reads use the existing comments endpoint for posts with comments in or near the viewport. At most two comment-page requests run concurrently, including preview, polling and older-page reads; offscreen posts are deferred. Results reuse the in-memory live-data cache. Feed count changes trigger a refresh for visible comments; the fallback poll is 30 seconds with a closed editor and 4 seconds while replying. Scroll/resume checks load newly visible posts. Unchanged rows are patched in place without resetting the editor, focus or caret. Initial errors expose a retry action without opening the editor; explicit retries bypass the normal failure backoff. Navigation, session changes and sign-out discard queued reads and prevent late responses from restoring private content. No Apps Script update is required.

## Audience and browsing

Every new post defaults to Friends only. The composer allows All users explicitly; this audience covers active signed-in accounts. Old posts with no audience value continue to use Friends only. Square lists public posts plus the viewer’s own/friends-only posts; Friends filters authors to the current friend group, and Mine filters to the current user. Guests and inactive accounts cannot read the feed. Friend-only access is checked again for likes, comments, pagination and every API request. Public posts permit interactions from other active accounts. Removing a friend does not hide a post that its author deliberately published to All users.

The author can delete a post; administrators can moderate posts through the existing deletion action. The existing permission rules for deleting comments remain. Public social profiles contain display name, handle, account ID, registration time and optional avatar path; email and account-management data are excluded.

## Photos and drafts

The browser accepts JPEG, PNG, WebP and decodable HEIC/HEIF, up to 10 MB. It re-encodes the image to JPEG while retaining proportions, caps the longest edge at 1280px and reduces quality to remain at most 1 MiB. No original metadata is uploaded. A preview and Remove photo control are available before publishing. Text and audience are retained on upload/publishing failure. The request ID and processed photo are reused after an uncertain response, so retrying does not create a second post or upload. Editing creates a new request ID. Drafts/photo bytes stay in memory and are cleared on leaving or signing out; delayed photo preparation cannot attach to another page/account.

The private image gateway is the existing server-key-protected service, with randomly generated owner paths. The script authorizes the post before obtaining a signed URL. Stored post records contain a path and content digest, never image bytes or signed URLs. Photo signing is batched for the selected feed page. A photo is deleted when its post is deleted; account purge also removes images. Temporary links may last one hour, as disclosed in Privacy. The underlying bucket remains private and its client policies are unchanged.

## Rollout

Frontend version 0.15.0 works with the existing version-5 service in friends-only text mode. Public audience, photo publishing and new browse filters require the version-6 capability from the backend. Use the focused upgrade in apps-script/README.md; no account migration or new key is needed. Existing social settings continue to disable Square independently of rooms, chat and song comments. The feed is paginated and only fetches more on request.
