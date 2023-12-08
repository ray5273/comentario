---
title: Show deleted comments
description: domain.defaults.comments.showDeleted
tags:
    - configuration
    - dynamic configuration
    - administration
---

This [dynamic configuration](/configuration/backend/dynamic) parameter controls the display of deleted comments.

<!--more-->

When set to `On`, deleting a comment in the embedded Comentario will only *mark it as deleted*, but it will still be visible. If set to `Off`, deleted comments will be hidden in the comment tree immediately, as well as all its child comments. Doesn't affect comment display in the Administration UI (it has a separate switch for hiding deleted comments).
