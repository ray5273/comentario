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

* Comments can have children — which we call **replies**. Child comments can also be *collapsed* and *expanded* by clicking the coloured left border line.
* Comment text can be formatted using the [Markdown syntax](/kb/markdown): you can make words **bold**, insert images and links, and so on.
* Comment thread uses mobile-first responsive design, which adapts well to different screen sizes.
* Comments can be edited and deleted by authors and moderators (all of which is configurable).
* Other users can vote on comments they like or dislike (unless voting is [disabled](/configuration/backend/dynamic/domain.defaults.comments.enablevoting)). Cast votes are reflected in the comment **score**.
* Comment threads can be sorted by time or score.
* Top-level comments can be [stickied](/kb/sticky-comment), which pins them at the top of the thread, regardless of the current sort.

{{< imgfig "/img/comentario-embed-ui-elements.png" "A (somewhat crowded) example of a comment tree on a web page." >}}

* There's a variety of login options available for commenters; there's also an [option](/configuration/frontend/domain/authentication) to write a comment without logging in (with an optional name), should the site owner enable it for this specific domain.
* Users can upload their own avatars, or opt to use [images from Gravatar](/configuration/backend/dynamic/integrations.usegravatar).
* There's also a [separate widget](/configuration/embedding/count-tag) for displaying number of comments on a page.
