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

Single Sign-On (SSO) allows you to authenticate users via an external provider, so that they don't need to create a separate Comentario account. There's also an option for a non-interactive SSO login, when the authentication process happens in the background.

<!--more-->

## SSO server

For the SSO authentication you'll need to specify an `SSO server URL`, which must be an `https://` address.

## SSO secret

The SSO secret is a randomly generated 32-byte sequence, which represents a shared secret. It's created by clicking the `SSO secret` button on the Domain properties page. When generated, this value is only *displayed once*, so make sure it's safely stored.

## Interactive SSO authentication flow

### Login redirect

After clicking the SSO login button, the user will be redirected to the SSO URL, enriched with the following two query parameters:

* `token`, a value consisting of 64 hexadecimal digits representing a user session token, and
* `hmac`, a value consisting of 64 hexadecimal digits, which is a SHA256 HMAC signature of the `token`. The signature is created using the shared SSO secret described above.

### Callback endpoint

The SSO identity provider has to authenticate the user and, once succeeded, redirect the user to Comentario's callback URL (`<Comentario base URL>/api/oauth/sso/callback`), adding the following two query parameters to it:

* `payload` — hexadecimal-encoded payload describing the user (see below), and
* `hmac` — SHA256 HMAC signature of the payload, also created using the shared SSO secret.

### Payload

The payload value holds a JSON-formatted user data, providing the following properties:

* `token`, which must be the same value that was passed during the initial SSO call;
* `email`, specifying the user's email address;
* `name`, providing the user's full name;
* `photo`, an optional user avatar URL.

For example:

```json
{
  "token": "0a3577213987d24993ef20d335f7b9769c1d1719b40767c6948d6c3882403a96",
  "email": "johndoe@example.com",
  "name": "John Doe"
}
```

### Single SSO provider for multiple domains

If your SSO provider is used for authentication against multiple Comentario domains, and you want to know which domain triggered the authentication, you can use one of the two options:

* Add domain name or ID to the SSO URL path, e.g.: `https://sso.example.com/auth/3f63a124-6208-4e2b-a7a0-651e6e317744`
* Add domain name or ID to a query parameter in the URL. Comentario will keep any existing query param in the SSO URL, and will only add (or replace) `token` and `hmac` as described above. Therefore you can use a URL like `https://sso.example.com/auth?host=myblog.org`. Then your SSO provider will need to look at the `host` parameter value and complete the authentication for this specific domain.

## Non-interactive SSO authentication flow

When activated, the `Non-interactive` switch changes the behaviour of the SSO authentication. The user won't see any login popup, but the whole process will be executed in the background.

The external auth process is very much similar to one described above, with the exception that it must be triggered externally:

1. There must be some Javascript code added to the page, which activates the SSO flow upon page load by calling the `nonInteractiveSsoLogin()` method of the `<comentario-comments>` HTML element.
2. Comentario creates a hidden iframe and points it to the SSO URL, providing the same `token` and `hmac` query parameters described above.
3. The SSO provider authenticates the user *non-interactively* (for instance, using session cookies) and redirects the user to the callback URL `<Comentario base URL>/api/oauth/sso/callback`, adding query parameters `payload` and `hmac` — also like the above.
4. Comentario redeems the login token and removes the hidden iframe.

