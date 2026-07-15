# PrivateLog Web App v0.2.3

A local-first personal web app. Data is stored only in the browser's localStorage unless you export it.

## Run on Windows

### Easiest method
1. Install Python from python.org if it is not already installed.
2. Open Command Prompt in this folder.
3. Run:
   python -m http.server 8080
4. Open:
   http://localhost:8080

You can also double-click `index.html`, although offline installation and the service worker require localhost or HTTPS.

## Use on iPhone

The app must be hosted over HTTPS for the best experience.

1. Upload this folder to a static host such as GitHub Pages, Netlify, or Cloudflare Pages.
2. Open the HTTPS address in Safari.
3. Tap Share.
4. Tap Add to Home Screen.

## Privacy notes

- There is no account, server database, analytics, or advertising.
- Records remain in the browser where they were entered.
- Clearing browser/site data can erase records.
- Use Settings → Export backup regularly.
- Anyone who can unlock the device and open the app can see its contents because no PIN was requested.

## Included features

- Partner profiles
- Date-based readable partner IDs
- Instagram handle
- Optional 0–5 rating
- Favourites
- Multi-participant encounters
- Per-participant roles
- Condom/bareback field
- Automatic 3P/4P/etc classification
- Locations and trips
- Timeline
- Colour-coded calendar
- Search
- Statistics
- Interactive relationship network
- JSON backup export/import
- Offline PWA support


## v0.2 changes

- Encounter-first workflow
- Create a new person without leaving the encounter
- Partners renamed to People
- Rating renamed to Overall
- Overall simplified to whole-star values from 0 to 5
- Previous locations appear as autocomplete suggestions
- Existing v0.1 browser data remains compatible


## v0.2.2

Visual-only release: refreshed Apple-inspired interface, glass cards, improved mobile navigation, forms, calendar, modal sheets and dark mode. Data storage and record format are unchanged.


## v0.2.2
- Added clearer icons throughout the interface.
- Added a friendlier home prompt and large New Encounter action.
- Improved empty states, quick actions, labels, and touch feedback.
- No changes to saved-data structure.


## v0.2.3

- Duplicate nicknames are supported safely through hidden UUIDs.
- Added optional identifiers and aliases to distinguish people with the same nickname.
- People search shows identifier, nationality, Instagram, visible ID, Overall and encounter count.
- A new person can still be created when an exact nickname already exists.
- Roles are now stored separately for every person in an encounter.
- Replaced Both with Vers.
- Protection, activities and personal notes are stored per person.
- Existing v0.2 encounter data is migrated when edited.
