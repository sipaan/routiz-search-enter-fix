# Routiz / Brikk: Enter in the location search picks the top suggestion

A small script for the [Brikk](https://themeforest.net/user/utillz) theme with the Routiz plugin (tested with Brikk 3.3.1 and Routiz 3.3.1, Google Maps as map provider). It makes **Enter** in the location search work like it does in Google Maps:

- the suggestion highlighted with the arrow keys is used, otherwise **the top suggestion**;
- pressing Enter before Google's suggestions have appeared waits for them, then picks the top one;
- the search runs once the chosen place is known, so the results are for that place;
- text Google has no suggestion for is searched as typed, as before.

It works for every location field Routiz builds with Google Places Autocomplete (`input[name="rz_geo"]`): the home page search form and the Explore page filters.

File: [`search-enter-picks-first-suggestion.js`](search-enter-picks-first-suggestion.js) (plain JavaScript, no dependencies, MIT licence).

## Background

In 2025 we (kurdish.food) shared a first version of this behaviour with Utillz. Brikk 3.3.1 now ships a script for it at the end of `footer.php`, inline after `wp_footer()`. Thank you for adding it! While testing kurdish.food on 2026-11-10 we found that this version, which was based on ours, only works when the visitor waits for the suggestions and doesn't use the arrow keys. This repository has the corrected version.

## What goes wrong in the current version (Brikk 3.3.1, `footer.php`)

The current script has two `keydown` handlers for Enter on `input[name="rz_geo"]` (both delegated with jQuery on `document`):

1. **A suggestion picked with the arrow keys loses its place.** The script only knows a suggestion was chosen when it sees a `mousedown` on `.pac-item`. After choosing with the arrow keys it thinks nothing was chosen, cancels the Enter (`preventDefault`, `stopPropagation`) and clicks the first item itself. The field keeps the text of the chosen suggestion, but Google's selection doesn't complete, so Routiz never stores the place's area (`rz_geo_n/e/s/w`) and the search runs **without a location**.
2. **Enter before the suggestions have loaded searches the raw text.** The script looks for suggestions 100 ms after Enter. A visitor who types quickly and presses Enter before Google has answered gets the "no suggestions" path, which submits the typed text ("rotterd") without a place, so the Explore page shows **all** listings.
3. **The search can run before the place is known.** After choosing a suggestion the script submits after a fixed 300 ms. Google first fetches the place's details; on a slow connection that takes longer, and the search runs with the previous area or none.
4. **The two handlers can race each other.** The second handler simulates ArrowDown and Enter 50 ms later; that synthetic Enter reaches the first handler again, so one key press can click suggestions and the search button more than once (from reading the code).
5. Smaller things: `console.log` debug lines and an `alert()` ("Please type a location and select from suggestions") ship to visitors, and the suggestion lookup is global (`.pac-item:first`), not tied to the field.

## What the new version does differently

- **One listener, first in line.** It listens on `window` in the capture phase, so it sees Enter before Google's own listener on the field and before any `document` handler. It ignores events it dispatches itself (`event.isTrusted`).
- **Google does the selecting.** It doesn't click suggestions. If no suggestion is highlighted it sends Google an ArrowDown (highlighting the top suggestion), then an Enter; Google's own keyboard handling selects the highlighted suggestion and fires `place_changed`, exactly as if the visitor had pressed the keys. A suggestion the visitor highlighted with the arrow keys stays highlighted and is used.
- **It waits for the suggestions** (up to 2.5 s) when Enter came early, instead of searching the raw text.
- **It searches when the place is known:** it waits until Routiz has written the new area to `rz_geo_n` (Routiz does this in its `place_changed` listener), then clicks the form's search button (home: `.rz-search-submit button`; Explore: `.rz-action-filter`). If the area doesn't change (the same place chosen again) it searches after 1.5 s.
- **One search per Enter:** pressing Enter again while a search is on its way does nothing.
- It stops its own Enter at the field after Google has handled it, so other Enter handlers further up (such as the current one in `footer.php`) don't run as well.

## Test results (kurdish.food, Chrome, 2026-11-10)

| Test | Current `footer.php` | New script |
|---|---|---|
| Home: type "den h", wait for suggestions, Enter | ✅ Den Haag | ✅ Den Haag |
| Home: type "rotterd", Enter straight away | ❌ searches "rotterd", all listings | ✅ Rotterdam |
| Home: arrow down to the 3rd suggestion, Enter | ❌ text kept, no area: all listings | ✅ Den Haag Centraal |
| Home: type "eindh", Enter twice straight away | — | ✅ Eindhoven, one search |
| Explore: type "utrec", Enter straight away | — | ✅ Utrecht, 2 listings |
| Explore: arrow down to the 2nd suggestion, Enter | — | ✅ Den Helder |

Not covered yet: phone keyboards (tested with a desktop keyboard), and Enter after closing the suggestions with Escape (waits 2.5 s, then searches the typed text).

## How to use it

**In the theme (suggested for Brikk):** replace the inline `<script>` after `wp_footer()` in `footer.php` with this file, for example:

```php
wp_enqueue_script( 'brk-search-enter', get_template_directory_uri() . '/assets/js/search-enter.js', array(), BK_VERSION, true );
```

It needs no jQuery and can load on every front-end page; it only acts on `input[name="rz_geo"]`.

**On a site, without changing the theme:** add the file's contents as a JavaScript snippet that runs in the footer (for example with [FluentSnippets](https://wordpress.org/plugins/easy-code-manager/) or Code Snippets). It takes precedence over the current `footer.php` handler, which then never runs.

## Licence

MIT, see [LICENSE](LICENSE). Use it in Brikk/Routiz or anywhere else.
