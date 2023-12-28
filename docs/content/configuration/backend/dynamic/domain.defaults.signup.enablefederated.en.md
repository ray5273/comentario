---
title: Enable commenter registration via external provider
description: domain.defaults.signup.enableFederated
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - /configuration/backend/dynamic/auth.signup.enabled.en
    - /configuration/backend/dynamic/domain.defaults.signup.enablelocal.en
    - /configuration/backend/dynamic/domain.defaults.signup.enablesso.en
---

This [dynamic configuration](/configuration/backend/dynamic) parameter controls whether new commenters are allowed to register in Comentario via a federated (external) identity provider such as Google or Facebook.

<!--more-->

If set to `Off`, no new commenter can register on websites embedding comments via federated providers. Doesn't apply to the Administration UI, which uses a [separate setting](/configuration/backend/dynamic/auth.signup.enabled.en) for that.
