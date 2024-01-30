---
title: Non-owner users can add domains
description: operation.newOwner.enabled
tags:
    - configuration
    - dynamic configuration
    - administration
---

This [dynamic configuration](/configuration/backend/dynamic) parameter configures whether users can register new domains.

<!--more-->

* If set to `On`, any registered user can add a domain on the service using the `New domain` button.
* If set to `Off`, users without domains (for example, commenters) won't be able to register their own domains in Comentario, and thus become domain owners. Most likely, this is what you want, therefore `Off` is the default.

This setting doesn't affect users who already own at least one domain.
