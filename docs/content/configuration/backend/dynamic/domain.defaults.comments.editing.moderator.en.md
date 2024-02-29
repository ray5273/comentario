---
title: Allow moderators to edit comments
description: domain.defaults.comments.editing.moderator
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - domain.defaults.comments.deletion.author
    - domain.defaults.comments.deletion.moderator
    - domain.defaults.comments.editing.author
---

This [dynamic configuration](/configuration/backend/dynamic) parameter can be used to specify whether moderators can edit comments on the domain.

<!--more-->

* When set to `On`, users with the moderator or owner [role](/kb/permissions/roles) and [superusers](/kb/permissions/superuser) will see a *pencil* button on every comment, allowing them to edit any comment on the domain's pages.
* If set to `Off`, comments cannot be changed by moderators (but possibly can [by their authors](domain.defaults.comments.editing.author) if enabled).
