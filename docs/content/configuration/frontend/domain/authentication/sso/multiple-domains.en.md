---
title: Single SSO provider for multiple domains
description: How the SSO server can distinguish between various domains
weight: 30
tags:
    - configuration
    - frontend
    - Administration UI
    - domain
    - authentication
    - SSO
    - Single Sign-On
seeAlso:
    - interactive
    - non-interactive
    - /configuration/frontend/domain/authentication/sso
---

If your SSO provider is used for authentication against multiple Comentario domains, and you want to know which domain triggered the authentication, you can use one of the two options.

<!--more-->

Either option assumes you add some data to the SSO URL you [configured](/configuration/frontend/domain/authentication/sso) for a specific domain.

* Domain name or ID can be added to the SSO URL path, e.g.: `https://sso.example.com/auth/3f63a124-6208-4e2b-a7a0-651e6e317744`, and let the SSO provider use that path element.
* Domain name or ID can also be added as a query parameter in the URL. Comentario will keep any existing query param in the SSO URL, and will only add (or replace) `token` and `hmac` as described above. Therefore, you can use a URL like `https://sso.example.com/auth?host=myblog.org`. Then your SSO provider will need to look at the `host` parameter value and perform the authentication for this specific domain.
