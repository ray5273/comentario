---
title: Enable tables in comments
description: domain.defaults.markdown.tables.enabled
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - domain.defaults.markdown.images.enabled
    - domain.defaults.markdown.links.enabled
---

This [dynamic configuration](/configuration/backend/dynamic) parameter configures whether tables can be inserted in comments.

<!--more-->

* If set to `On`, commenters can insert [tables](/kb/markdown#tables) in comments.
* If set to `Off`, commenters won't be able to insert tables, and the corresponding markup will be removed from the resulting text.
 
This setting only applies to newly written comments and does not affect tables in existing comments.
