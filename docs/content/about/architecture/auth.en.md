---
title: Authentication
description: How Comentario authenticates its users
tags:
    - about
    - architecture
    - backend
    - server
    - frontend
    - Administration UI
    - authentication
seeAlso:
    - /about/architecture
    - /configuration/embedding
---

Since embedded Comentario runs on the page it's placed upon, it always means a *different domain* than the server and the Administration UI reside on (they both run on the [](/kb/base-url)).

<!--more-->

For example, your Comentario server may run on `https://comentario.example.com`, but it's used to display comments on `https://blog.example.com/post/12345`.

As a consequence, it's impossible to share authentication data between the two frontends because then refer to different [origins](https://developer.mozilla.org/en-US/docs/Glossary/Origin).

In practice, it means you have to login separately:

* Into the Administration UI, and
* Into Comentario on every domain it serves.

In either case the authentication is stored in a *user session cookie* bound to the current domain:

* `comentario_user_session` for the Administration UI.
* `comentario_commenter_session` for embedded comments.

However, if you click on the `Settings` (gear) button on the comments page, and then on `Edit Comentario profile`, the system will issue a one-off token that will then be used to log you in to the Admin UI directly.
