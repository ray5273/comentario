---
title: Moderation
description: Moderation domain settings
weight: 20
tags:
    - configuration
    - frontend
    - Administration UI
    - domain
    - moderation
---

The `Moderation` tab defines moderation and moderator notification policies for domain comments.

<!--more-->

## Require moderator approval on comment

The moderation policy outlines situations the comment doesn't get automatically the `Approved` status in, queueing for moderation instead:

* Author is anonymous
* Author is authenticated
* Author has less than N of approved comments
* Author is registered less than N days ago
* Comment contains link
* Comment contains image

### Extensions

Given that none of the above criteria wasn't triggered to flag a comment for moderation, it will further be checked by any [configured extensions](extensions), which can still flag the comment.

## Email moderators

The moderator notification policy allows to configure whether and when domain moderators get notified about a new comment on the domain:

* Never
* Only for comments pending moderation
* For all new comments
