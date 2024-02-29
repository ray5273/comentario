---
title: Show deleted comments
description: domain.defaults.comments.showDeleted
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - domain.defaults.comments.deletion.author
    - domain.defaults.comments.deletion.moderator
---

This [dynamic configuration](/configuration/backend/dynamic) parameter controls the display of deleted comments.

<!--more-->

* When set to `On`, deleting a comment in the embedded Comentario will only *mark it as deleted*, but it will still be visible.
* If set to `Off`, deleted comments will be hidden in the comment tree immediately, as well as all its child comments.

This setting doesn't affect comment display in the Administration UI (it has a separate switch for hiding deleted comments).
