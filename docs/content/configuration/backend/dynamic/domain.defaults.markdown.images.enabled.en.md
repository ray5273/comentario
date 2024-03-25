---
title: Enable images in comments
description: domain.defaults.markdown.images.enabled
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - domain.defaults.markdown.links.enabled
    - domain.defaults.markdown.tables.enabled
---

This [dynamic configuration](/configuration/backend/dynamic) parameter configures whether images can be inserted in comments.

<!--more-->

* If set to `On`, commenters can insert [images](/kb/markdown#images) in comments.
* If set to `Off`, commenters won't be able to insert images, and the corresponding markup will be removed from the resulting text.

This setting only applies to newly written comments and does not affect images in existing comments.
