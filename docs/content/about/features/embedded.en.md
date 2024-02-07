---
title: Embedded comments
description: Comentario features when embedding on other websites
weight: 10
tags:
    - about
    - features
    - embedding
---

Comentario's **embedded comment engine** allows to render a [comment thread (tree)](/kb/comment-tree), and each page it's embedded on has its own comment tree.

<!--more-->

* Comments can have children — which we call **replies**. Child comments can also be *collapsed* with a button.
* Comment text can be formatted using the [Markdown syntax](/kb/markdown): you can make words **bold**, insert images and links, and so on.
* Comment thread uses mobile-first responsive design, which adapts well to different screen sizes.
* Comments can be edited and deleted.
* Other users can vote on comments they like or dislike (unless [disabled](/configuration/backend/dynamic/domain.defaults.comments.enablevoting.en)). Voting is reflected in the comment **score**.

{{< imgfig "/img/comentario-embed-ui-elements.png" "Example of comment tree on a web page." "border shadow p-4" >}}

* There's a variety of login options available for commenters; there's also an [option](/configuration/frontend/domain/authentication) to write a comment anonymously, should the site owner enable it for this specific domain.
* Users can upload their own avatars, or opt to use [images from Gravatar](/configuration/backend/dynamic/domain.defaults.usegravatar.en).
