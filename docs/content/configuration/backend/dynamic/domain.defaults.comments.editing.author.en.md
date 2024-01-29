---
title: Allow comment authors to edit comments
description: domain.defaults.comments.editing.author
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
  - /configuration/backend/dynamic/domain.defaults.comments.editing.moderator.en
---

This [dynamic configuration](/configuration/backend/dynamic) parameter can be used to specify whether commenters can edit their comments.

<!--more-->

When set to `On`, comment authors will see a *pencil* button on their comments, which allows them to edit a written comment. If set to `Off`, comments cannot be changed by their authors once submitted  (but possibly can [by domain moderators](domain.defaults.comments.editing.moderator.en) if enabled).
