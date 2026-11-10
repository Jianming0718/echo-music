# Mobile layout

The layout below 641px follows the supplied music-list reference while retaining Echo's theme and five navigation destinations. Desktop styling and the playback transport remain in place.

- Song rows use 52px square covers, a 16px title (15px on narrow screens), a 13px artist line, and a separate menu target. Category, duration and numbering stay out of the mobile row; the existing menus and filters retain those details.
- Saved songs show a check badge. Unsaved songs can still be saved through the song menu. The current song uses the theme accent; three small bars animate only while it is actually playing and stop under reduced-motion preferences.
- Tapping unused space in a mobile song row activates its existing play action. Artist links, save controls, menus, inputs and selected text retain their own interactions. Desktop row behavior is unchanged.
- The 68px mini player uses actual cover, title and artist data, save, play/pause and queue controls, and a thin progress line. Existing cover palette variables tint the background without adding another image request or animation.
- The bottom navigation occupies the full width, uses larger icons and labels, retains Music, Search, Library, Square and Friends, and reserves the bottom safe area. Content padding accounts for both player and navigation; the existing mobile keyboard behavior hides them while editing.
- Playlist sheets receive matching row typography and cover sizes. Favorites use a round play control with an accessible translated label. No fake OS status bar, radio source or device connection is introduced.

`mobile-layout.css` loads after the existing styles and is included in the offline shell. Its phone rules are confined to the mobile breakpoint; light and dark color tokens remain distinct. CSS fallback backgrounds precede color-mix declarations.

Validation includes breakpoint-specific stylesheet evaluation at 320, 390 and 430px, both themes, row/menu/save interactions, pause/current-state synchronization, desktop behavior, reduced motion and the on-screen keyboard. These DOM/CSS checks do not replace browser rendering or a physical iPhone visual check.
