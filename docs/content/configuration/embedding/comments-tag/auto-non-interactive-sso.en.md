---
title: 'Attribute: auto-non-interactive-sso'
description: The `auto-non-interactive-sso` attribute of the `<comentario-comments>` tag allows to automatically initiate SSO login upon load
tags:
    - configuration
    - comments
    - embedding
    - HTML
    - JavaScript
    - SSO
    - Single Sign-On
seeAlso:
    - ../comments-tag
    - /configuration/frontend/domain/authentication/sso/non-interactive
---

The `auto-non-interactive-sso` attribute of the [comments tag](../comments-tag) allows to automatically trigger the [non-interactive SSO login flow](/configuration/frontend/domain/authentication/sso/non-interactive) upon page load.

<!--more-->

This attribute is only relevant when your website has [non-interactive SSO](/configuration/frontend/domain/authentication/sso/non-interactive) configured.

* If set to `false` (the default), you'll need to programmatically initiate the SSO flow: find more details [here](/configuration/frontend/domain/authentication/sso/non-interactive#triggering-non-interactive-sso-flow).
* If set to `true`, Comentario will automatically initiate the SSO flow as soon as it's done initialising.
