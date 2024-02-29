---
title: Allow moderators to delete comments
description: domain.defaults.comments.deletion.moderator
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - domain.defaults.comments.deletion.author
    - domain.defaults.comments.editing.author
    - domain.defaults.comments.editing.moderator
    - domain.defaults.comments.showdeleted
---

This [dynamic configuration](/configuration/backend/dynamic) parameter can be used to specify whether moderators can delete comments on the domain.

<!--more-->

* When set to `On`, users with the moderator or owner [role](/kb/permissions/roles) and [superusers](/kb/permissions/superuser) will see a *trashcan* button on every comment, allowing them to delete any comment on the domain's pages.
* If set to `Off`, comments cannot be removed by moderators (but possibly can [by their authors](domain.defaults.comments.deletion.author) if enabled).
