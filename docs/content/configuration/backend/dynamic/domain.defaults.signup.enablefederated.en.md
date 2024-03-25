---
title: Enable commenter registration via external provider
description: domain.defaults.signup.enableFederated
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - auth.signup.enabled
    - domain.defaults.signup.enablelocal
    - domain.defaults.signup.enablesso
---

This [dynamic configuration](/configuration/backend/dynamic) parameter controls whether new commenters are allowed to register in Comentario via a federated (external) identity provider, such as Google or Facebook.

<!--more-->

* If set to `On`, new commenters can register on websites embedding comments via federated identity providers.
* If set to `Off`, external user registration on websites embedding comments will be forbidden.

This setting doesn't apply to the Administration UI, which uses a [separate configuration item](auth.signup.enabled) for that.

It also doesn't affect *existing users*, i.e. those already registered. They will be able to log in even when this setting is disabled. To disable federated login completely, switch off undesirable providers in the domain's [authentication settings](/configuration/frontend/domain/authentication).
