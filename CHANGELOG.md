# Comentario changelog

## v3.0.0-rc1

This is the first major update to Comentario, which phases out the flawed legacy data model and improves on pretty much every aspect.

**❗ IMPORTANT:**

* This release brings an extensive code change. You're strongly encouraged to **back up your database** before updating. Please read the [Migration docs section](https://edge.docs.comentario.app/en/installation/migration/comentario-2.x/) carefully.
* Since this is a pre-release, **do not use this in production**.

**Changes:**

* **❗ BREAKING:** The new data model, which will replace the old one once the automated migration is successful.\
  **❗ WARNING:** due to many limitations and quirks of the legacy data model, this migration may fail or produce a somewhat skewed results. Proceed with caution and **verify the migration results carefully**.
* Overhauled user management. There's now a single user list, with role bindings for each domain.
* The concept of *superuser* is introduced. Superusers can manages users, configuration, and all other types of objects in a particular Comentario instance.
* Other user roles are configured per domain and include:
  * *Owner*: can manage domain settings and user roles in the domain
  * *Moderator*: can moderate, edit, or delete comments
  * *Commenter*: can write comments
  * *Read-only*: can only read comments or vote for them
* User can be *banned* by a superuser, which makes them unable to login anymore or register with the same email.
* Much more elaborate view statistics. Views are registered on the page level, and include data such as browser, IP, and country. (Most of that isn't visible in the UI yet.)
* More moderation policy choices for domain, requiring moderation for:
  * Users having fewer than `N` approved comments
  * Users registered less than `N` days ago
  * Comments containing links
  * Comments containing images
* Domain-wide page and comment list (#1).
* Support for uploaded user avatars.
* Support for login with Facebook (#3).
* Support for images in comments (#13).
* Support for so-called extensions; for now, these include comment content checkers for spam or toxicity. Each extension can be enabled and configured for each domain separately. Available extensions:
  * Akismet
  * APILayer SpamChecker (configurable spam threshold)
  * Perspective (configurable thresholds for `toxicity`, `severeToxicity`, `identityAttack`, `insult`, `profanity`, `threat`)
* Support for non-interactive SSO (#21).
* Backend configuration has been split into static and dynamic parts. The dynamic configuration can be changed on-the-fly and includes settings such as:
  * Require email confirmation for commenters.
  * Require email confirmation for users.
  * Disable user registration altogether.
  * Disable users become owners.
  * Disable inserting links into comments, including turning URLs into links.
  * Disable inserting images into comments.
* Static config option to replace the home page content.
* **❗ BREAKING:** The embed part is now a web component. Existing installs will need to use tag `<comentario-comments>` instead of `<div>`.
* **❗ BREAKING:** Data attributes (`data-...`) on the script tag are no longer supported. Use attributes on the `<comentario-comments>` instead, omitting the `data-` prefix (#14).
* More elaborate end-2-end tests (many more coming).
* Fixes for numerous issues and bugs.

## v2.3.1

**Changes:**

* New statistical chart in Dashboard, showing graphs for views and comments across all domains (8557838)
* Optimised stats gathering, which should especially be noticeable on pages with lots of views or comments (8557838)
* Fix: statistics is now displayed over the correct 30-day interval; use colour-coding for the metrics (7d4da5f) 
* Embed: Fix password reset for commenter (b6d07dc) 
* Embed: Add password reset dialog (c522489)
* Embed: Fix settings saving for OAuth users (c522489) 
* Embed: Setting `data-css-override="false"` disables CSS completely (resolves #10) (3590185) 
* Embed: Don't fail Comentario load on CSS load failure (resolves #12) (d499784) 
* Embed: Fix `data-*` attributes not working (6453eb3)
* Helm: drop `comentario.indexHtmlConfigMapName` config value
* Chore: add `start` (watch) script for yarn (b8bb54c)

## v2.3.0

This release brings a **whole new administration UI** (frontend) for website owners, developed from scratch with Angular. There are too many improvements to mention, bust most notable ones are:

* **BREAKING CHANGE:** the .js-script is moved from `js/` to the site root (e.g. `https://<your-domain>/comentario.js`);
* Complete support for all screen sizes, from mobiles to XL desktops;
* Multilingual UI support;
* New dashboard screen showing statistics across all your domains;
* Proper authentication based on HTTP-only cookies;
* Proper input validation;
* Domain clone function;
* Domain data export downloads the dump file instead of sending an email;
* New `SSLMode` setting for PostgreSQL connection.

Contrary to what was previously said, the database still *maintains full compatibility* with Commento 1.8.0 and all previous Comentario versions. We intend to totally rework the data model in subsequent releases, because Commento data model is flawed in many ways.

## v2.2.3

This release brings no extra functionality to Comentario, but rather concentrates on the automated build pipeline, stability, and [documentation](https://docs.comentario.app/).

We're now using Cypress for end-to-end (e2e) tests (the proper tests will follow).

## v2.2.2

**Changes:**

* Helm chart: add `comentario.indexHtmlConfigMapName` config value (073c0b8)
* Serve favicon at root (a56ea0f)
* Tie style to Comentario colours (e1b21f4)
* Fix: Vue error in dashboard (ac4993f)

## v2.2.1

**Changes:**

* Allow serving `index.html` at root when present (20bb3db)
* Fix: comment voting turned score into `NaN` for zero-score comment (bca19a3)
* Allow moderator edit others' comments (resolves #2) (84c5ec1)
* Allow interrupting connection process with `SIGINT` (0a0e83e, 40c13b8)

## v2.2.0

* This release features a major backend overhaul: Comentario is now using server code generated with [go-swagger](https://goswagger.io/) based on the [Swagger/OpenAPI spec](swagger/swagger.yml).
* All available federated authentication options are fully functional again: GitHub, GitLab, Google, Twitter, and SSO.
* This is the last Comentario version that's fully compatible (meaning, backward- and forward-compatible) with Commento database v1.8.0.
* It's also *almost* compatible with Commento API, with the exception that it consumes `application/json` instead of `application/x-www-form-urlencoded`.

**Changes:**

* Twitter OAuth re-added (9446502, ab1f244)
* Fix: avatar handling and resizing for all identity providers (59c8643)
* Fix: federated auth completion (proper HTML gets served) (a0c4626)
* OAuth flows refactored (2533eda, af56d81, dc2c9c6)
* Gzip producer for downloads (4c8df85)
* Comentario Helm chart and image updates (802dddb, 9d0a645, 4f06183, 968059c, a89a99a)
* Backend refactoring: OpenAPI code generator used (26e099c, 1b0ab10, 27b9e6f, b127050, f82c1be, 1ae87f4, e57dc4c, fe2306d, 8139ae4, e8ebe29, c84828a, dd03b35, 6c99df9, 90c095c, b3ac79c)

## v2.1.0

**Changes:**

* Bump ci-tools v2, Go 1.20, Postgres 15-alpine (cf574c1)
* Restyle error box (f7b2b6b)
* Hide all controls when page load has failed (f7b2b6b)
* Add Helm chart (508a72f, 0a029ab, 2ea9354, 4696d6e, c464c8f, 89232e3, 8a8b29d, 4e17bb2, 945d8e8, c529653, 57b2b8e)
* Rebranding Commento → Comentario (f143215, 8803b26, 5e7d5ea)
* Highlight and scroll to added comment (161222b)
* Move card options to the bottom (4655d3f)
* Validate and submit forms using Ctrl+Enter (a30c430)
* Close dialogs with Esc (82e4163)
* Visual input validation (9271bf6)
* Popup confirmation dialog on comment delete (2a539ea)
* Ditch Makefiles and prod/devel targets (d255a86)
* Blur/animate backdrop (82e4163)
* Add Popper, redesign dialogs & make them responsive (b81d555, 4260dcd)
* DB connect: use a progressive delay and up to 10 attempts (29c0df8)
* Add `nofollow noopener noreferrer` to profile links (c398f5a)
* Move version to console message appearing upon init (6f050af)
* Fix: anonymous checkbox (00939d0)
* Fix: footer overlapping with following content (2918264)
* Fix: Comentario load when session token invalid (e64fa8a)
* Refactor the frontend into components and DSL pattern (5de1790, 3e2fc44, ca9643f, dea5fd9, 4fd1d02, 64b1903, 6776ed1, 7d71261, 33e0d4b, 23808de, 8ce6def)
* docs: reflow the license text (8f7916b)

## v2.0.1

This is the very first public release of Comentario, a successor of (seemingly discontinued) [Commento](https://gitlab.com/commento/commento) (resolves commento/commento#414).

**Changes:**

* Add this changelog (resolves commento/commento#344)
* Modernise all code and its dependencies. Migrate to Go 1.19, Node 18 (62d0ff0, 6818638, c6db746, e9beec9; resolves commento/commento#407, commento/commento#331, resolves commento/commento#421)
* Drop support for non-ES6 browsers (Chrome 50-, Firefox 53-, Edge 14-, Safari 9-, Opera 37-, IE 11-) (62d0ff0)
* Resolve potential resource leak in api/version.go (62d0ff0)
* Place login/signup fields on a form and add `autocomplete` attribute. Submit the login or the signup with Enter. This must enable proper support for password managers, it also eliminates a browser warning about password field not contained by a form (f477a71, 0923f96; resolves commento/commento#138)
* Fix doubling comment on login via OAuth2 (c181c2e; resolves commento/commento#342) and locally (582455c)
* Force nofollow and target="_blank" on external links (d90b8bd; resolves commento/commento#341)
* Remove Twitter OAuth 1 as obsolete and dysfunctional (e9beec9)
* Migrate commento.js to TypeScript + Webpack (a22ed44, ca4ee7b, ef37fd4, dafb8ac, f575dc0, e349806)
* Backend: handle errors properly (4d92d4f)
* Backend: filter out deleted comments (1672508)
* Reimplement build pipeline for `dev` or tags (f654924, e3e55a6, 02a9beb, 6aa9f58, 9a65b3d, f7f6628)
* Other, internal changes.
