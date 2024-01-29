---
title: Allow moderators to edit comments
description: domain.defaults.comments.editing.moderator
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
  - /configuration/backend/dynamic/domain.defaults.comments.editing.author.en
---

This [dynamic configuration](/configuration/backend/dynamic) parameter can be used to specify whether moderators can edit comments on the domain.

<!--more-->

When set to `On`, users with the [role](/kb/permissions/roles) moderator and above (owner, [superuser](/kb/permissions/superuser)) will be able to edit any comment on the domain's pages. If set to `Off`, comments cannot be changed by moderators (but possibly can [by their authors](domain.defaults.comments.editing.author.en) if enabled).
