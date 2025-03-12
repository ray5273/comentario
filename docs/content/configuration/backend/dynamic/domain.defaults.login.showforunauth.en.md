---
title: Show login dialog for unauthenticated users
description: domain.defaults.login.showForUnauth
tags:
    - configuration
    - dynamic configuration
seeAlso:
    - /configuration/frontend/domain/authentication
    - domain.defaults.signup.enablefederated
    - domain.defaults.signup.enablelocal
    - domain.defaults.signup.enablesso
---

This [dynamic configuration](/configuration/backend/dynamic) parameter allows to fine-tune the behaviour of embedded Comentario when an unauthenticated user is submitting a comment.

<!--more-->

* If set to `On`, an unauthenticated user will be presented a pop-up `Log in` dialog, where they can choose whether to sign in or to continue unauthenticated.
* If set to `Off`, the login dialog will be skipped if [commenting without registration](/configuration/frontend/domain/authentication) is enabled for this domain. Otherwise the dialog will be shown and user will be requested to log in or sign up.

When this setting is `Off`, the user can still authenticate explicitly using the `Sign in` button above the comment editor.
