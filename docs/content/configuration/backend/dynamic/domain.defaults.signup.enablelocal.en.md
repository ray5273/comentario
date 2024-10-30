---
title: Enable local commenter registration
description: domain.defaults.signup.enableLocal
tags:
    - configuration
    - dynamic configuration
    - administration
    - local authentication
seeAlso:
    - auth.emailupdate.enabled
    - auth.signup.enabled
    - domain.defaults.signup.enablefederated
    - domain.defaults.signup.enablesso
---

This [dynamic configuration](/configuration/backend/dynamic) parameter controls whether new commenters are allowed to register in Comentario with email and password.

<!--more-->

* If set to `On`, new commenters can register on websites embedding comments with email and password.
* If set to `Off`, user registration (with email/password) on websites embedding comments will be forbidden.

This setting doesn't apply to the Administration UI, which uses a [separate configuration item](auth.signup.enabled) for that.

It also doesn't affect *existing users*. They will be able to log in even when this setting is disabled. To disable login with email/password completely, switch it off in the domain's [authentication settings](/configuration/frontend/domain/authentication).
