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
  Comentario adds no tracking scripts or pixels, and shows no ads. It does collect some high-level statistics, such as visitor's country, browser, and language. It can collect visitor's IP addresses, but this option is off by default.
* **Multiple login options**
    * Optional anonymous comments;
    * Local authentication with email and password;
    * Social login via Google, Twitter/X, Facebook, GitHub, GitLab;
    * Single Sign-On ([interactive](/configuration/frontend/domain/authentication/sso/interactive) and [non-interactive](/configuration/frontend/domain/authentication/sso/non-interactive)).
* **Hierarchical comments**\
  Each comment can be replied to, which results in nested comments. The number of nesting levels is unlimited, but you can opt to limit the maximum visual nesting level. 
* **Markdown formatting**\
  Comment text can be formatted by using simple [Markdown rules](/kb/markdown). So users can use **bold**, *italic*, ~~strikethrough~~, insert links, images, tables, code blocks etc.
* **Sticky comments**\
  Top-level comments can be marked [sticky](/kb/sticky-comment), pinning them at the top.
* Comment **editing** and **deletion**
* **Voting** on a comment
* [Live comment updates](/kb/live-update) without reload
* Custom **user avatars**: uploaded or from Gravatar
* **Email notifications** about replies or comments pending moderation
* **Multiple domains** in a single Administration UI
* Flexible **moderation** settings
* External comment **content checkers** (extensions)
* View and comment **statistics**, per-domain and overall
* Import from Disqus, WordPress, Commento.

Let's now look into the available features in more detail.

From the end-user perspective, Comentario consists of two parts: the **[embedded comment engine](embedded)** and the **[Administration UI](admin-ui)** (we also call it the frontend). 
