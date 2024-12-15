---
title: Maximum comment text length
description: comments.text.maxLength
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - domain.defaults.comments.editing.author
    - domain.defaults.comments.editing.moderator
    - domain.defaults.markdown.images.enabled
    - domain.defaults.markdown.links.enabled
    - domain.defaults.markdown.tables.enabled
---

This [dynamic configuration](/configuration/backend/dynamic) parameter sets a limit on the comment text length.

<!--more-->

It defines how long comment texts can be on a specific domain, representing the allowed maximum number of characters in the comment's original [Markdown](/kb/Markdown) text.

* The lowest possible value for this setting is the "Twitter limit" of `140` characters.
* The top (physical) limit is `1048576` (1 MiB).
