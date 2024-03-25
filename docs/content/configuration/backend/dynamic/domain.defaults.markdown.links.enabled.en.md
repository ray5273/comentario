---
title: Enable links in comments
description: domain.defaults.markdown.links.enabled
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - domain.defaults.markdown.images.enabled
    - domain.defaults.markdown.tables.enabled
---

This [dynamic configuration](/configuration/backend/dynamic) parameter configures whether links can be inserted in comments.

<!--more-->

* If set to `On`, commenters can insert [clickable links](/kb/markdown#links) in comments, either using the `[text](url)` syntax or simply as a URL.
* If set to `Off`, commenters won't be able to insert links, and the corresponding string will be rendered as plain, non-clickable text.

This setting only applies to newly written comments and does not affect links in existing comments.
