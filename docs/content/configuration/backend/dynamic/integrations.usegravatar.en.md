---
title: Use Gravatar for user avatars
description: integrations.useGravatar
tags:
    - configuration
    - dynamic configuration
    - administration
    - integration
---

This [dynamic configuration](/configuration/backend/dynamic) parameter configures the use of the [Gravatar](https://www.gravatar.com) service.

<!--more-->

* When set to `On`, Comentario will try to fetch an avatar image from Gravatar for each registered or logging-in user. For federated users (those registering via Google, Facebook etc.), the identity provider avatar will be tried first.\
  It also enables the use of Gravatar during import (e.g. from [Commento](/installation/migration/commento) or [WordPress](/installation/migration/wordpress)).
* If set to `Off`, Gravatar won't be contacted.

