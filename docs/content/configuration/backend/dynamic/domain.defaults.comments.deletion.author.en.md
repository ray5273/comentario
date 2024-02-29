---
title: Allow comment authors to delete comments
description: domain.defaults.comments.deletion.author
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - domain.defaults.comments.deletion.moderator
    - domain.defaults.comments.editing.author
    - domain.defaults.comments.editing.moderator
    - domain.defaults.comments.showdeleted
---

This [dynamic configuration](/configuration/backend/dynamic) parameter can be used to specify whether commenters can delete their comments.

<!--more-->

* When set to `On`, comment authors will see a *trashcan* button on their comments, which allows them to delete a written comment.
* If set to `Off`, comments cannot be removed by their authors once submitted  (but possibly can [by domain moderators](domain.defaults.comments.deletion.moderator) if enabled).
