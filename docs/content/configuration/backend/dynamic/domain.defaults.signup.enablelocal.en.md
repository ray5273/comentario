---
title: Enable local commenter registration
description: domain.defaults.signup.enableLocal
tags:
    - configuration
    - dynamic configuration
    - administration
    - local authentication
seeAlso:
    - /configuration/backend/dynamic/auth.signup.enabled.en
    - /configuration/backend/dynamic/domain.defaults.signup.enablefederated.en
    - /configuration/backend/dynamic/domain.defaults.signup.enablesso.en
---

This [dynamic configuration](/configuration/backend/dynamic) parameter controls whether new commenters are allowed to register in Comentario with email and password.

<!--more-->

If set to `Off`, no new commenter can register on websites embedding comments with email/password. Doesn't apply to the Administration UI, which uses a [separate setting](/configuration/backend/dynamic/auth.signup.enabled.en) for that.
