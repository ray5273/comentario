# Comentario

[Homepage](https://comentario.app/) · [Live Demo](https://demo.comentario.app) · [Docs](https://docs.comentario.app/) · [Blog](https://yktoo.com/en/blog/series/comentario/)

---

**[Comentario](https://comentario.app)** is an open-source web comment engine, which adds discussion functionality to plain, boring web pages.

Available features:

## Features in a nutshell

* **Privacy by design**\
  Comentario adds no tracking scripts or pixels, and shows no ads. It does collect some high-level statistics, such as visitor's country, browser, and language.
* **Multilingual**\
  Embedded comment engine supports i18n out-of-the-box.
* **Role-based access**\
  Every user gets a role (Owner, Moderator, Commenter, or Read-only) within a specific domain. There's also the global superuser privilege.
* **Multiple login options**
  * Optional commenting without registration, including anonymous comments;
  * Local authentication with email and password;
  * Social login via Google, Twitter/X, Facebook, GitHub, GitLab;
  * Any generic OpenID Connect (OIDC) provider, e.g. LinkedIn;
  * Single Sign-On (interactive and non-interactive).
* **Hierarchical comments**\
  Each comment can be replied to, which results in nested comments. The number of nesting levels is unlimited, but you can opt to limit the maximum visual nesting level.
* **Markdown formatting**\
  Comment text supports simple Markdown formatting rules. So users can use **bold**, *italic*, ~~strikethrough~~, insert links, images, tables, code blocks etc.
* **Thread locking**\
  Commenting on certain pages can be disabled by the moderator by making the page read-only. This can also be done for the entire domain by "freezing" it.
* **Sticky comments**\
  Top-level comment can be marked sticky, which pins it at the top of the list.
* **Comment editing and deletion**\
  Comments can be edited and deleted, either by the author or by a moderator — all of it is configurable.
* **Comment voting**\
  Users can upvote and downvote comments, updating their score. This feature is also configurable.
* **Live comment updates**\
  When a user adds or updates a comment, everyone sees this change immediately, without reload.
* **Custom user avatars**\
  Comentario supports avatars from external identity providers, including SSO, as well as Gravatar. Users can also upload their own image.
* **Email notifications**\
  Users can choose to get notified about replies to their comments. Moderators can also get notified about a comment pending moderation, or every comment.
* **Multiple domains in one UI**\
  Comentario offers the so-called Administration UI, allowing to manage all your domains, pages, comments, users in a single interface.
* **Flexible moderation rules**\
  Each domain has own settings, automatically flagging comments for moderation based on whether the user is registered, how many approved comments they have, how long ago they registered, whether the comment contains a link etc.
* **Extensions**\
  The so-called extensions link Comentario to external services that check comment text for spam, offensive language, or toxic content. Those services include Akismet, APILayer, and Perspective, and they are configured separately for each domain.
* **Statistics**\
  Comentario collects and displays statistics on views and comments. It includes high-level depersonalised data, such as country, language, OS, browser, and device type. The statistical data can be viewed per-domain or for the entire system.
* **RSS feeds**\
  You can subscribe via RSS to comment updates on the entire domain or a specific page, optionally filtering by user and/or replies to a user.
* **Data import/export**\
  Comments and users can be easily imported from Disqus, WordPress, Commento/Commento++. Existing data can also be exported as a JSON file.
* **Comment count widget**\
  You can display the number of comments on a specific page using a simple widget.

## FAQ

### How does Comentario differ from its predecessor Commento?

Indeed, Comentario started as a fork of the now-discontinued Commento, and it still bears a remote resemblance to its predecessor.

Since Comentario 3.0 release, however, it has become a completely different product. There's literally no legacy code left.

Feel free to examine the [changelog](CHANGELOG.md), but here are a few major points:

* Comentario is in active development, regularly adding tons of features and improvements.
* Comentario is running the latest and greatest software versions, with all necessary security updates.
* Comentario is blazing fast due to extensive code and data model optimisations.
* Comentario is built following the best practices for security, privacy, responsive design, and accessibility.
* Comentario is (aiming to be) fully tested using automated tests to prevent regressions.

## Getting started

Refer to [Comentario documentation](https://docs.comentario.app/en/getting-started/) to learn how to install and configure it.
