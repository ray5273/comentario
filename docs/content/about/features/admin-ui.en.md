---
title: Administration UI
description: Features of the Administration UI
weight: 20
tags:
    - about
    - features
    - Administration UI
---

The **Administration UI** is an extensive web application that allows users to perform all kinds of administrative tasks, moderate comments, view statistics, etc.

<!--more-->

There's also the Profile section, where users can edit their profile, change their password, upload a custom avatar (or use a Gravatar). It also allows users to [delete their account](/legal/account-removal).

The functionality available in the Administration UI depends on [user roles](/kb/permissions) and includes:

* Managing domain settings:
    * [Authentication](/configuration/frontend/domain/authentication) (commenting without registration, social login, [SSO](/configuration/frontend/domain/authentication/sso))
    * [Moderation](/configuration/frontend/domain/moderation) (which comments are to be queued for moderation)
    * [Extensions](/configuration/frontend/domain/extensions) capable of spam and toxicity detection
    * Domain user management
* Import from [Disqus](/installation/migration/disqus), [WordPress](/installation/migration/wordpress), [Commento](/installation/migration/commento)
* Comment moderation
* Email notifications
* View and comment statistics
* Various domain operations (data export, comment removal, freezing, etc)
