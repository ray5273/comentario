---
title: SSO authentication
description: Single Sign-On settings
weight: 10
tags:
    - configuration
    - frontend
    - Administration UI
    - domain
    - authentication
    - SSO
    - Single Sign-On
---

Single Sign-On (SSO) allows you to authenticate users via an external provider, so that they don't need to create a separate Comentario account. There's also an option for a [non-interactive](non-interactive) SSO login, when the authentication process happens in the background.

<!--more-->

## SSO server

For the SSO authentication you'll need to specify an `SSO server URL`, which must be an `https://` address.

## SSO secret

The SSO secret is a randomly generated 32-byte sequence, which represents a shared secret and looks like this:

```text
a7c0a4de68cef4f16dcce202f5ec378dd5a858a307ec3858c91742c7eccece77
```


It's created by clicking the `SSO secret` button on the Domain properties page. When generated, this value is only *displayed once*, so make sure it's safely stored.

## Interactive vs. Non-interactive

Comentario supports two SSO flavours: [interactive](interactive) and [non-interactive](non-interactive).
