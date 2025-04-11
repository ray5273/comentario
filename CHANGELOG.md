# Comentario changelog

## v3.13.1 Glenarm

This is a bugfix version:

* Fix: comment import being terminated halfway when the number of untitled pages is high (#163) - ddb5fad0
* Fix: background Gravatar processor being created multiple times - 24906377

## v3.13.0 Garvagh

In this version we've added RSS support for comments, a new comment count widget (`<comentario-count>`) for websites, implemented animated content loaders, introduced the `--no-page-view-stats` command-line parameter, and made quite a few code and presentation fixes.

### Changes

* Implement RSS feeds: for the entire domain, one specific page, and optionally filtering by author or as a reply - ba59e8ba, ef88d1b4, 726bcde0, 5f5a818d, 0c023549, 20d8db0b, 2a059536, 34fdab5b 
* Add <comentario-count> tag (#147) - 2f3b72b4, 94965a66, c20e4a0d
* Admin UI: add welcome screen to the Dashboard - 7cac91b3, 5f6ba263, f948920f
* Admin UI: replace spinners on large elements with loaders - 5466d4bb, 3e4fd557
* Admin UI: make selected domain be always at the top of the list - 0f733135
* Admin UI: improve validation, skip focus on "show password" button - 60fa016c
* Admin UI: improve detail tables, streamline form controls - 3a449822, 08fa35ba
* Admin UI: improve and unify user badges - cc5a58d3
* Admin UI: refactor toasts, add syntax highlighting to technical error details - a7a80ad7
* Admin UI: uniform spinners, fix spinner label alignment - fad9c466
* Admin UI: add domain page edit function (#148) - 2b2ce2b1, d7eb66c1
* Admin UI: allow owner/superuser to edit domain self-user - 9655f1be
* Admin UI: upgrade to Angular 19, bump other deps, ci-tools v41 - 7127efc2
* Admin UI: switch to `application` build system - 4eff4f16
* SSO: add role to SSO payload (#157) - 8a1e68c1
* Refactor/unify mail templates - 26608c3f
* Helm: add args value - e627351b, ea326a96, 058226ef, e6996f51
* Add `--no-page-view-stats` CLI param (#102) - dc159c94
* Fix truncating text (result length, damaged Unicode chars) (#145) - fabdb10f
* Packaging: flag config files in /etc to prevent overwriting them (#146) - 3007bdae
* Docs: clarify SMTP port/encryption (#158) - 1b0f04db
* Go 1.24, ci-tools v45, bump deps - a7b25f58
* Plugin subsystem improvements - 02480097, 710df9e1, 0f8cf59b, 656d54d7, 3f525f42, 44d44c07, edcc19e6, bf06e9df, 00658e6b, cf932309, 2e9fde81
* Code fixes and optimisations - 79983544, f2fdfed5, 90ef348a, ffb63f52, 0fc69408
* Demo DB: actualise comment count for domain and pages - 6ce6b979
* Demo DB: let user sessions and votes survive reset (up to a week) - 26efcb88
* Demo DB: make predefined comments appear the oldest - 3ff69bbd
* CI: add Helm chart linting - e6996f51

## v3.12.0 Faughanvale

This release brings proper multilingual support for commenter users (for example, emails will now be sent in the user's language if it's supported), user email address update feature, maximum comment text length setting, and support for PostgreSQL 17 and ARM64 Docker images, as well as a multitude of bugfixes and improvements.

### Changes

* Add multilingual support for users, based on language during the registration (#139) - 85b16f5a, 86779f13, 973be645, e8831678
* Add email update function (#134) - 46e72102, 900dac21, d095310b, e8a14a46, 4d8a78dd, 42d7c93a, 39463c28, 479e9000
* Add support PostgreSQL 17 (#135) - 7527e9fa
* Add a dynamic config parameter for max comment length (#142) - 27bcc28d, 4dcbdf04
* Add support for `arm64` Docker images via `docker buildx` - 2a621a07
* Serve fonts locally - 772c3dd9
* Admin UI: numeric param validation in dynamic config - 4dcbdf04
* Admin UI: show spinners on module load - 23aa6b4b
* Admin UI: fix saving Profile for federated user - 973be645
* Admin UI: Profile: user language picker, refactor password change fields - ea592fa9
* Admin UI: fix reverting dynamic config item - 42565473
* Backend: fix comment vote update (#141) - 25bb7c0b
* Backend: OAuth: fix callback checks - 209a2f54
* Backend: OAuth: fall back to NickName if no Name provided (#64) - 4d3b7fad
* Backend: fix user signup IP not masked - 45dffbec
* I18n: translate missing entries (French, Vietnamese), fix typos (French) - 33b10117
* I18n: add Spanish translation by Briant Fabela - 4cb49e6f
* I18n: update Chinese translations - 0d05a56b
* I18n: pt-br update by @savioribeiro - b2809b59
* Email templates: fix double exclamation - 74ef59f5
* Docs: Angular: update `ngx-comentario` example - 0ff92b07
* Docs: fixes - 257018ea
* Docs: Comment editor: fix strikeout shortcut - 50698751
* Docs: update embedded Comentario graphic, minor updates - 57a44c2d
* Plugin subsystem improvements - e27b5b0d, e599549f, d95796f0, bf8574e9, 0dd6fa4b, 0cbbdaa2, a92b1372m, aa2575cc
* Demo DB: add Spanish, French, Brazilian Portuguese pages - 354e4921
* Demo DB: better data cleanup - bd00baed
* CI: ci-tools v40, Hugo 0.139.0 - c5245c9d, b5b9330e, 27bf32ba
* CI: fix static build dirs, fix package queries - 89aca27b
* CI: fix ARM64 build (versioned as v8.0 now) - 278d91d0
* CI: force dynamic linking and use correct gcc for ARM builds (#136) - 3fe7d84c, 09f73f6d

## v3.11.0 Enniskillen

The most notable change in this release is the enhanced Dashboard and Domain Statistics page. You can now view pie charts of page views, broken down by country, device, browser, and operating system, along with the top five pages by views and comments. The embedded Comentario has also been improved: the comment editor now supports keyboard shortcuts, user avatars render better on high-DPI screens, and Comentario is now available in French (thanks to Eric Cambray).

### Changes

* Admin UI: add pageview stats by country, device, browser, OS - 8d586aff, c1829030, a9983587, 92cc9950
* Admin UI: add top performing pages in stats - 955b391c, 753855e4, f9eb58f5
* Admin UI: user details: fix SSO user property display - c7c63d49
* Admin UI: fix the web app manifest for installation - 3a407dad
* Admin UI: support non-root domain path (#126) - 4e35a801
* Embed: comment editor: add keyboard shortcuts - 0d080d58
* Embed: use Cmd+Enter in forms on Mac OS - c46d7eac
* Embed, Admin UI: use larger avatars on devices with greater pixel ratio (#123) - b8a5fa42
* I18n: French translation - 68b61e26
* Backend: fix imported users being marked for SSO (#133)
* Backend: validate "From" email address during startup (#129) - eed3a689
* Backend: fix XSRF token renewal regression (#130) - a351b0c1, c88f401d
* Backend: refactor DB statements to use ORM - 62aa8687, 0f2be712, 48c81fbe, df9b65ea, f8f2789a, 232ba6b0, 7d615e74
* Backend: plugin support (work in progress) - c9832c30, 385d76f0, f1d2c762, 8e59b4b4, 200f15fa, 37f02d9d, a2821847, c05266f8, 126950c1
* Docs: minor README and link update - 708d172c
* Docs: add editor help - c46d7eac, 6f864f89
* Docs: correct `--email-from=` default value (#129) - 81c02584
* CI: add `go vet` - 9c0a9aa1
* CI: demo: send emails from `@comentario.app` - 140bce2b

## v3.10.0 Donaghadee

In this version we've improved language support by applying a fallback path for language variants and by adding Chinese Simplified and Traditional (thanks [@Func86](https://gitlab.com/Func86)!), added spinners to embedded comments for time-consuming API calls, extended the Comment properties page with comment text in HTML and Markdown — with syntax highlighting! — and fixed outstanding issues preventing IPv6 addresses from being registered. We also made changing a user's notification settings possible for domain owners, and massively improved doc search functionality.

### Changes

* Embed: add spinners to buttons running API calls (#94) - f6e755ad
* Embed: disable comment resubmissions (#116) - e09e73a3
* Embed: use `Intl.RelativeTimeFormat` for relative time (#122) - c445983b, 0cd63e9d, 2abe30e3, 583d8241
* Embed: display localized date and time - 7278b0b7, 7becc866
* Embed: fix code blocks expanding beyond the card's width (#110) - a0ea36ec
* Embed: add Jest and unit tests for `Utils` - 1d1f1dfb
* Embed: only *build* by default; *test* and *lint* are executed separately - 8f6b9008
* Admin UI: domain user edit page: add notification settings (#119) - bd2c48a4
* Admin UI: comment props: show HTML/markdown; add syntax highlighting to install snippet - a069a4f3, 0a810fe1
* Admin UI: show user signup & comment author data - 4f896d4e
* Admin UI: improve front page placeholder display, replace deprecated test code - bf08870f
* Backend: support IPv6 in `cm_users.signup_ip`, `cm_comments.author_ip` (#95) - 46d7456d
* I18n: serve embed & backend messages with fallbacks applied (#121) - b27dc5cf, a26fef23, 6d498a2f, 473f1c8b
* I18n: add translations for Chinese - 5f856615, 057f1f0b
* I18n: enlarge user `lang_id` col to 255 chars (#107) - 66694713
* Docs: add Read on link to section children snippets - d0eeef9f
* Docs: expand self-host desc somewhat - d0eeef9f
* Docs: add Architecture section (#117) - f6c44900
* Docs: switch to using Hugo environments - 0bd269bf
* Docs: fix and improve search, rank results based on location and number of occurrences, re-search on back/forward navigation, add result count display - ae6d2821
* Docs: README: update blog link - 0ed9064f
* Support for custom user attributes - d456bd04, 25cbea37
* Docker: fix `ENV` warning - f6df3d77
* CI: run the pipeline for each commit, but publish stuff in dev/tag only - 1c54406d
* Code: require Go 1.23.0 - 5d17c53b, fe830021

## v3.9.0 Crossgar

This release implements external OIDC authentication, including login via LinkedIn, adds dark theme support to embedded comments, allows a direct database migration from Commento++, and fixes a number of issues. It also adds Vietnamese to the list of available languages.

From now on, the `latest` Docker image tag will refer to the most recent *released version*; the most recent dev build (what used to be `latest` before) is now tagged as `edge`. Thanks to this, pulling `registry.gitlab.com/comentario/comentario` will result in the latest stable Comentario image. We also added Ubuntu-based Docker images, built from a dynamically-linked binary.

### Changes

* Add dark theme support (#101) - 7e3a6bd1, 5957b6bc, 8d0e9f77
* Add support for OIDC authentication (incl. LinkedIn login) (#25, #4; obsoletes !5) - a11b0591, 5bcccd0e, cf7bb8b7, 6fe7f68e
* Use federated ID for user lookups, before resorting to email lookup (#99) - c0c7bba1
* SSO: add link payload property (#98) - 1e84833b
* Frontend: add proper favicons/manifests for all platforms and `robots.txt` - 35be77ea
* Publish Comentario Helm chart to GitLab chart repository - 15e9793f
* Add Ubuntu-based Docker image build - c4f8e547
* Allow migration from Commento++ (#97) - 4b129fe8
* Change image tagging logic: `latest` is now latest release, `edge` is latest dev - 7081c751
* Frontend: Angular 18, ESLint 9, bump other deps - 80355b17
* Add translation to Vietnamese - 03287764
* Fix: set XSRF & language cookies only when necessary (#103) - 26661c1c
* Fix: XSRF key generation - 2d439162
* Fix: page title fetching when path contains query (#106) - a39a9f4c
* Fix: double pageview counting (#108, deprecates !8) - 7b49952a
* Fix: Embed: non-interactive SSO message handler removal (#96) - 07f3c519
* Fix: Embed: remove Comentario background (#105) - af827099

## v3.8.0 Belfast

This release adds own comment/page counts to the Dashboard, enables automatic Admin UI login from the user settings dialog on a comment page, adds Comentario version upgrade checks, improves embedded engine error handling, and fixes a number of issues. It also adds Brazilian Portuguese to the list of available languages.

### Changes

* Config manager: display a notification in the sidebar and an upgrade link - bb00751, 858c6da, e4ca7a9, 72779a0
* Dashboard: add counts of pages/comments you authored - 7a13f5e
* Add optional `xsrfSecret` value to secrets (#75) - a6c11fb
* Embed: transparent login to Admin UI on `Edit Comentario profile` click - d256dca, 7b61f97, 3ea3ff9
* Embed: better startup error handling - 906185a
* Embed: content placeholders while loading (#94) - 906185a
* Embed: disable toolbar on preview (#93) - 50d8366
* Backend logging improvements: log colouring, times with milliseconds, better formatting, `--no-color` CLI option - 5b6c9d0
* Add translation to Brazilian Portuguese (thanks to Guilherme Alves) - f5ed5ff, 5fac68d
* Dynamic config: disable images in markdown by default to mitigate possible identity attacks - 678cd4a
* Fix: only support IPv4 in `signup_ip`/`author_ip` (works around #95) - fb844b1
* Fix: also mask `author_ip` - fb844b1
* Fix: reset failed login counter on unlock (#91) - c21175b

## v3.7.0 Armagh

In this release we've introduced domain-level dynamic configuration, added support for unregistered commenters with a name (previously they were always "Anonymous"), a new setting for email notifications about comment approval/rejection, extended comment metadata with details about its editing, added failed login tracking, and more.

### Changes

* Implement domain-level dynamic config, which uses the previously available global settings as defaults - 61d6ab0, e742b6c, 26c264c, 07d039b, bbd9223, 0080e6f, f18db2e, 621c394, cf549c3, bb0c42f, 478bc14, bbe3084, f39b80a, 056fd23, f784429, 57fbab7, 16c4816
* Add support for named unregistered users (#40) - fe67590, 27bd7a5, 508a98d
* Implement user login tracking, user locking, add password change time (#72) - 94bde34, 97c839f
* Support IPv6 addresses (#69), more robust user IP handling (#76) - daf1a9f, 9514e6f
* Admin UI: add user session list/expire button to user properties - 435dcbf
* Embed: handle OAuth popup opening failure with a dialog (#89) - 16c6abb
* Embed: add user setting for comment status notifications (#74) - fa5f4dd, 9c94f38
* Embed: streamline the login dialog - cacafc6
* Embed: add `auto-non-interactive-sso` attribute of `<comentario-comments>` tag (#81) - 217af15, a2d95e0
* Embed: optimise Comentario startup by getting rid of separate config API call - 3ce7a09
* Embed: improve comment metadata (subtitle) display (#59, #60) - 8f65f97, dc43833
* Fix unmasked IP registered with pageview (#77) - ca0f0e6
* Documentation improvements and fixes (#82) - 7a24146, 44d4a98, d3a32f6, e7f3cb7, fa4db4f, 2d70ba8

## v3.6.0

This release adds multilingual capabilities to embedded Comentario and email templates, including Russian and Dutch translations.

### Changes

* Add i18n support (#71) - 102a731, 77767f8, 48edac1, 54f0a21, 30c69fb, cad411c, 9b81192, c2f2701, 4c306ec, ece2372, 0462046
* Helm chart: add new values and detailed documentation - 29bfe79
* Make Terms of Service and Privacy Policy URLs configurable (#56) - 5ac0174
* Embed: turn live update off if disabled globally - 25f2eeb
* PostgreSQL migration script: fix Commento DB migration with repeated user email (thanks Ahmad Abu Hantash) - 92df96d

## v3.5.0

This version introduces a complete support for a file-based SQLite database. You don't need PostgreSQL anymore to try things out, or even to run Comentario on a low-traffic website! It also enables unauthenticated SMTP and largely improves docs on configuring external identity providers.

### Changes

* Support for local SQLite database - 5c89782, 13579b0, 416b664, ed5626a, 4375528, 3fbe1af
* Make SMTP auth optional, improve logging, default port to 587 (#68) - 79b3feb
* Embed: redesign the profile bar (use icons instead of text labels), ditch moderator toolbar - bb47386
* Embed: hide sort bar when there's no comment - 79213e7
* Fix the comment count API endpoint (#66) - 5756942
* Upgrade the toolchain to Go 1.22, Hugo 0.123.6 - 3de87cd, a7eb480
* Documentation: provide instructions for configuring Facebook, Google, Twitter, GitHub, GitLab auth (#67) - 9a52173, a2464b2
* Other docs updates - e9fceb4, 521ef47, 4d43f9a, ce4b619

## v3.4.0

In this release we added **live comment updates** via WebSockets: you don't need to reload the page to see new comments. We also added a **toolbar in the comment editor**, removed the Collapse child button in favour of **clickable left border**, and added binary builds for 32- and 64-bit **ARM architectures**.

### Changes

* Admin UI: fix user link rendering for anonymous - d98be3e
* Live update via WebSockets (#9) - 24a2ce2, 6400faf, 513dd1c, b9e16d7, 1797bec, 4d3d64e, ee11a82, 3364b86, 1410031, 93bf25f, a8dd8de
* Live update: add CLI flags `--no-live-update`, `--ws-max-clients` - 3364b86
* Embed: optimise animation handling, improve comment expand toggler - 1c30b47
* Embed: deleted comments specify who deleted them (author/moderator) when possible (#62) - b815297
* Add options controlling comment deletion by author/moderator - 7a2fdaf
* Add options controlling comment editing by author/moderator (#61) - 3f588af
* Make item names localizable - 23d9358
* Admin UI: allow regular users to delete own comments - b9476b9
* Admin UI: show moderated and deleted user and timestamp in Comment properties - b9476b9
* Add binary builds for arm/arm64 (#57) - 201be4b, c2060b6, c8fd26d
* Embed: add editor toolbar (#49) - b6700e8, c593350, a4e129f, 7ec2ba2
* Allow blockquote in Markdown - 1c10abf
* Allow strikethrough text in Markdown - a383d8b
* Domain operations: reset comment/view counts on clearing domain (#55) - ac0eabc
* Embed: replace collapse button with border click - 7d811c7
* Embed: restyle icons - 7d811c7
* Embed: show notice when no auth is configured for domain - dd95be9, 222e7f5, 5eb8ef7

## v3.3.0

This release introduces comment preview feature, persisted sort settings and the anonymous commenter status (which has moved to the Login dialog). It also adds fine-grained configuration parameters for controlling user registrations.

Furthermore, we published a preview of Comentario Angular library [ngx-comentario](https://www.npmjs.com/package/ngx-comentario), which allows to easily embed comments into a single-page Angular app.

### Changes

* Add static binary tarball to release artifacts (#50) - f4c2623
* Embed: comment preview feature (#43) - 7f8c7e4, 4f0fe0a
* Embed: move "Comment anonymously" to Login dialog - df25c15, 9dc80ea, 25ef9b0
* Embed: persist sort/anonymous settings locally - 25ef9b0
* Embed: sort by upvotes, ascending - 72cfedc
* Embed: hide sort by upvotes when voting is disabled (#48) - 72cfedc
* Embed: hide Edit profile for SSO user (#45) - a41e563
* New dynamic config items for controlling commenter signups (#47) - 3df0e8e
* Dynamic config editor: improved layout for switches - 1034af2
* Documentation updates (also #46) - f6fe3af, 13e61df, 075c27a, 0dd4452

## v3.2.2

This is another bugfix release, finally fixing the "Failed to construct 'CustomElement'" error.

## v3.2.1

This is a bugfix release:

* Fix the "Failed to construct 'CustomElement': The result must not have children" error when the web component is reinserted on the page. This is often the case with an SPA.

## v3.2.0

In this release we added configuration entries for enabling tables in Markdown and voting on comments. Also the Administration UI is now properly protected against CSRF attacks.

### Changes

* Make comment voting configurable (#26) - 254b701
* Add reason to moderation notification email (#44) - b27d77e
* Add support for tables in Markdown (#37) - a9ffbd4
* CSRF-protect the frontend API (#42) - 25f8bcf, 546d293
* Harden embed auth - af8d8ff, 325bade, 53b11f8, 898cd2f, dc0bd60
* Upgrade frontend to Angular 17, backend to Go 1.21.5 - 58c1f96, 754897f, b584cc9

## v3.1.0

This release brings Gravatar avatars support, import from WordPress, Markdown improvements, and better control over deleted comments.

### Changes

* Show user avatar in User details, when present - eec2120
* Implement WordPress import (#29) - 390dd9a, e5041fe, a513919, a4471ae, fc9718a
* Add support for Gravatar (#33, #35, #36) - 5ffebde, 7fb2ca6, 44456e2, 60b09ae, 11e2cc7, fe31420
* Enforce strong passwords - 059f864
* Add comment deletion and purging options in Profile, Ban user, and Delete user dialogs (#27) - 1c7e168
* Documentation improvements - bb9cc18
* Fix comment image sizing (the image shouldn't be wider than the comment item) - 3656e8b, c54a90e
* Markdown: support hard line breaks (#38); switch to goldmark for Markdown parsing markdown; initial support for tables (#37) - 0fe6642
* Domain operations: add `Purge comments` operation - 7dcc69c, 7e8d083
* Add dynamic config parameter: `domain.defaults.comments.showDeleted` (#30) - 98ed3dc
* Stats: exclude deleted comments from totals and charts - a7e7d91
* Domain properties: add visual attribute editor - e2124b7
* Add support for max. nesting level setting (#32) - 1fe0a75, e614844
* Merge docs into this repository - 591429b

## v3.0.0

This release introduces an almost complete end-2-end test coverage of the available functionality, which resulted in numerous fixes in the process.

It also drops support for PostgreSQL prior to 10, but introduces support for PostgreSQL 16.

### ❗ IMPORTANT ❗

* This release brings an extensive code change as compared to Comentario 2.x (or Commento). You're strongly encouraged to **back up your database** before upgrading. Please read the [Migration docs section](https://docs.comentario.app/en/installation/migration/comentario-2.x/) carefully before upgrade!

### Changes

* Disallow banning/deleting of a system account (d559080)
* Helm chart: get rid of "beta" API for autoscaler (7268d68)
* Fix daily stats collection and display (c0c68a6)
* Fix stats for superuser (5fd0c8a)
* Embed: fix button layout and colours (5478728)
* Streamline external links, copyable properties (b4de284)
* Domain editor: add schema dropdown (46d3d53)
* Fix domain creation/updating (46d3d53)
* Fix page querying for commenters page list (6b8479f)
* Profile: allow changing website URL (7c09df6)
* Restyle Dashboard, add page and user "backdrop chart" (eb4d0be, 1d83e16, d637185)
* Drop PostgreSQL 9.6, add 16 (38a4b36)
* Fix migration script (38a4b36)
* Static config: add DB version (4878290), server time (184c12c)
* Domain import: fix Cancel link (f15c981)
* Fix nullable IdP ID (5577c3a)
* Fix comment sort (2d0a7e2)
* Import from Disqus: allow import of "named anonymous" users (#28)
* Fix handling of URLs ending with '/' (fixes issues with Disqus comment import, SSO config, #28)
* Fix endless Observable loop when authentication is lost halfway (a4f8dbe)
* Embed: render "time ago" as a permalink for the comment (#31)
* Embed: remove Markdown popup in favour of docs link (fc1c42d)
* Import: use provided page/thread title instead of fetching it every time (f87b7c9)
* Add spinner when selecting domain (80b5553)
* More robust domain selector (80b5553)
* Fix comment list display when deleting a comment (80b5553)
* Skip fetching avatar for Anonymous (80b5553)
* End-2-end testing with every major PostgreSQL version (10 through 16; a6fa6f6, 38a4b36)

## v3.0.0-rc2

**Changes:**

* Binary `.deb` and `.rpm` packages allow to install Comentario locally as a systemd service.

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

* This release features a major backend overhaul: Comentario is now using server code generated with [go-swagger](https://goswagger.io/) based on the [Swagger/OpenAPI spec](resources/swagger/swagger.yml).
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
