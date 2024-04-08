---
title: Max. failed login attempts
description: auth.login.local.maxAttempts
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - /configuration/frontend/domain/authentication
---

This [dynamic configuration](/configuration/backend/dynamic) parameter configures how many times the user can try to login with a wrong password before getting locked out of Comentario.

<!--more-->

Comentario keeps a counter of failed login attempts for each user.

* As soon as that counter *exceeds* the value specified for this setting (the default is `10`), the corresponding account will be locked. It will then require an intervention of a [superuser](/kb/permissions/superuser) to become unlocked.
* If the setting's value is `0`, no lockout will ever happen. This means the user is *always allowed at least one retry*.
* The failed login attempt counter gets reset to zero as soon as the user has successfully logged in.

This mechanism is mostly intended to safeguard users against brute-force attacks on their passwords. In order to disable it, set the value to `0`.
