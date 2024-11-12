---
title: Moderation
description: Moderation domain settings
weight: 30
tags:
    - configuration
    - frontend
    - Administration UI
    - domain
    - moderation
seeAlso:
    - /configuration/frontend/domain
    - /configuration/frontend/domain/extensions
---

The `Moderation` tab defines moderation and moderator notification policies for domain comments.

<!--more-->

## Require moderator approval on comment

The moderation policy outlines situations which the comment doesn't get automatically the `Approved` status in, queueing for moderation instead:

* Author is unregistered;
* Author is authenticated;
* Author has less than `N` approved comments;
* Author is registered less than `N` days ago;
* Comment contains link;
* Comment contains image.

### Extensions

Given that none of the above criteria was triggered to flag a comment for moderation, it will further be checked by any [configured extensions](extensions), which can still flag the comment.

## Email moderators

The moderator notification policy allows to configure whether and when domain moderators get notified about a new comment on the domain:

* Never
* Only for comments pending moderation
* For all new comments
