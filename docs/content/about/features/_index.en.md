---
title: Features
description: What's so special about Comentario?
weight: 10
tags:
    - about
    - features
---

## Features in a nutshell

* **Privacy by design**\
  Comentario adds no tracking scripts or pixels, and shows no ads. It does collect some high-level statistics, such as visitor's country, browser, and language. It can collect visitors' IP addresses, but this option is off by default.
* **Multilingual**\
  Embedded comment engine supports [i18n](/contributing/i18n) out-of-the-box.
* **Role-based access**\
  Every user gets a [role](/kb/permissions/roles) (Owner, Moderator, Commenter, or Read-only) within a specific [domain](/kb/domain). There's also the global [superuser](/kb/permissions/superuser) privilege.
* **Multiple login options**
    * Optional commenting without registration, including anonymous comments;
    * Local authentication with email and password;
    * Social login via Google, Twitter/X, Facebook, GitHub, GitLab;
    * Single Sign-On ([interactive](/configuration/frontend/domain/authentication/sso/interactive) and [non-interactive](/configuration/frontend/domain/authentication/sso/non-interactive)).
* **Hierarchical comments**\
  Each comment can be replied to, which results in [nested comments](/kb/comment-tree). The number of nesting levels is unlimited, but you can opt to limit the maximum visual nesting level. 
* **Markdown formatting**\
  Comment text supports simple [Markdown formatting](/kb/markdown) rules. So users can use **bold**, *italic*, ~~strikethrough~~, insert links, images, tables, code blocks etc.
* **Thread locking**\
  Commenting on certain [pages](/kb/domain-page) can be disabled by the moderator by making the page read-only. This can also be done for the entire [domain](/kb/domain) by "freezing" it.
* **Sticky comments**\
  Top-level comment can be marked [sticky](/kb/sticky-comment), which pins it at the top of the list.
* **Comment editing and deletion**\
  Comments can be edited and deleted, either by the author or by a moderator — all of it is configurable.
* **Comment voting**\
  Users can upvote and downvote comments, updating their score. This feature is also configurable.
* **Live comment updates**\
  When a user adds or updates a comment, everyone sees this change [immediately](/kb/live-update), without reload.
* **Custom user avatars**\
  Comentario supports avatars from external identity providers, including SSO, as well as [Gravatar](/configuration/backend/dynamic/integrations.usegravatar). Users can also upload their own image.
* **Email notifications**\
  Users can choose to get notified about replies to their comments. Moderators can also get notified about a comment pending moderation, or every comment.
* **Multiple domains in one UI**\
  Comentario offers the so-called [Administration UI](admin-ui), allowing to manage all your [domains](/kb/domain), [pages](/kb/domain-page), comments, users in a single interface.
* **Flexible moderation rules**\
  Each domain has own [settings](/configuration/frontend/domain/moderation), automatically flagging comments for moderation based on whether the user is registered, how many approved comments they have, how long ago they registered, whether the comment contains a link etc. 
* **Extensions**\
  The so-called [extensions](/configuration/frontend/domain/extensions) link Comentario to external services that check comment text for spam, offensive language, or toxic content. Those services include [Akismet](/configuration/frontend/domain/extensions/akismet), [APILayer](/configuration/frontend/domain/extensions/api-layer-spam-checker), and [Perspective](/configuration/frontend/domain/extensions/perspective), and they are configured separately for each domain.
* **Statistics**\
  Comentario collects and displays statistics on views and comments. It includes high-level depersonalised data, such as country, language, OS, browser, and device type. The statistical data can be viewed per-domain or for the entire system.
* **RSS feeds**\
  You can [subscribe via RSS](/kb/rss) to comment updates on the entire domain or a specific page, optionally filtering by user and/or replies to a user.
* **Data import/export**\
  Comments and users can be easily [imported](/installation/migration) from [Disqus](/installation/migration/disqus), [WordPress](/installation/migration/wordpress), [Commento/Commento++](/installation/migration/commento). Existing data can also be exported as a JSON file.
* **Comment count widget**\
  You can display the number of comments on a specific page using a [simple widget](/configuration/embedding/count-tag).

From the end-user perspective, Comentario consists of two parts: the **[embedded comment engine](embedded)** and the **[Administration UI](admin-ui)** (we also call it the frontend). 
