---
title: Enable commenter registration via SSO
description: domain.defaults.signup.enableSso
tags:
    - configuration
    - dynamic configuration
    - administration
    - SSO
    - Single Sign-On
seeAlso:
    - auth.signup.enabled
    - domain.defaults.signup.enablefederated
    - domain.defaults.signup.enablelocal
    - /configuration/frontend/domain/authentication/sso
---

This [dynamic configuration](/configuration/backend/dynamic) parameter controls whether new commenters are allowed to register in Comentario via [Single Sign-On](/configuration/frontend/domain/authentication/sso) (SSO).

<!--more-->

* If set to `On`, new commenters can register on websites embedding comments via SSO.
* If set to `Off`, SSO registration on websites embedding comments will be forbidden.

This setting doesn't affect *SSO users who are already registered*. They will be able to log in even when this setting is disabled. To disable SSO login completely, switch it off in the domain's [authentication settings](/configuration/frontend/domain/authentication).
