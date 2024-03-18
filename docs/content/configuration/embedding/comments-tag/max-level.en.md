---
title: 'Attribute: max-level'
description: The `max-level` attribute of the `<comentario-comments>` limits the visual nesting level of comments
tags:
    - configuration
    - comments
    - embedding
    - HTML
seeAlso:
    - ../comments-tag
---

The `max-level` attribute of the [comments tag](../comments-tag) allows to limit the displayed nesting (indentation) of embedded comments.

<!--more-->

Comments become [nested](/kb/comment-tree) when they are created as a reply to another comment. Comentario doesn't limit the actual nesting level: any comment can be replied to.

It is, however, difficult to deal with comments nested too deeply. Since every level gets indented further to the right, thus limiting the available width for the comment text, it will get unusable at some point.

To address the above issue, Comentario will cap the *visual nesting level* at **10** by default. You can adjust this value by using the `max-level` attribute.
