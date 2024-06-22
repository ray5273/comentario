---
title: Identity provider configuration
description: How to configure external (federated) identity providers for Comentario
weight: 100
tags:
    - configuration
    - identity provider
    - idp
    - authentication
    - OIDC
    - OpenID Connect
    - OAuth2
seeAlso:
    - /configuration/backend/secrets
    - /configuration/frontend/domain/authentication
---

Comentario can be connected to external authentication services called *identity providers* or, for short, *IdPs*. They let users to log into Comentario without needing to explicitly register a new account.

<!--more-->

This process is called *federated authentication*.

Comentario supports a number of such services. Each of them has its own way of configuring login, but all of them use either the standard **OAuth2 Client Credentials** flow, or **OIDC code flow**.

Below you can find provider-specific instructions for configuring OAuth2 login for Comentario.
