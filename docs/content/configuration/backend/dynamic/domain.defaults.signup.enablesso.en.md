---
title: Enable registration of new users
description: domain.defaults.signup.enableSso
tags:
    - configuration
    - dynamic configuration
    - administration
    - SSO
    - Single Sign-On
seeAlso:
    - /configuration/backend/dynamic/auth.signup.enabled.en
    - /configuration/backend/dynamic/domain.defaults.signup.enablefederated.en
    - /configuration/backend/dynamic/domain.defaults.signup.enablelocal.en
---

This [dynamic configuration](/configuration/backend/dynamic) parameter controls whether new commenters are allowed to register in Comentario via Single Sign-On (SSO).

<!--more-->

If set to `Off`, no new commenter can register on websites embedding comments via SSO. Doesn't apply to the Administration UI, which uses a [separate setting](/configuration/backend/dynamic/auth.signup.enabled.en) for that.
