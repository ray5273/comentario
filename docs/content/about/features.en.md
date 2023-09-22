---
title: Features
description: What's so special about Comentario?
weight: 10
tags:
    - about
    - features
---

From the end-user perspective, Comentario consists of two parts: the **embedded comment engine** and the **Administration UI** (we also call it the frontend). 

## Embedded comments

Comentario's embedded comment engine allows to render a [comment thread (tree)](/kb/comment-tree), and each page it's embedded on has its own comment tree.

* Comments can have children — which we call **replies**. Child comments can also be *collapsed* with a button.
* Comment text can be formatted using the [Markdown syntax](/kb/markdown): you can make words **bold**, insert images and links, and so on.
* Comment thread uses mobile-first responsive design, which adapts well to different screen sizes.
* Comments can be edited and deleted.
* Other users can vote on comments they like or dislike. Voting is reflected in the comment **score**.

{{< imgfig "/img/comentario-embed-ui-elements.png" "Example of comment tree on a web page." "border shadow p-4" >}}

There's a variety of login options available for commenters; there's also an option to write a comment anonymously, should the site owner enable it for this specific domain.

## Administration UI

The Administration UI is an extensive web application that allows users to perform all kinds of administrative tasks, moderate comments, view statistics, etc.

There's also the Profile section, where users can edit their profile, change their password, or upload a custom avatar. It also allows users to [delete their account](/legal/account-removal).

The functionality available in the Administration UI depends on [user roles](/kb/permissions) and includes:

* Managing domain settings:
    * Authentication (anonymous comment, social login, SSO)
    * Moderation (which comments are to be queued for moderation)
    * Configuration (extensions for spam and toxicity detection)
    * Domain user management
    * Other properties (freeze or clean comments, etc.)
* Import from Commento and Disqus
* Comment moderation
* Email notifications
* View and comment statistics
