---
title: Non-interactive SSO
description: The non-interactive SSO authentication flow
weight: 20
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
    - multiple-domains
    - /configuration/frontend/domain/authentication/sso
---

Non-interactive [SSO authentication](/configuration/frontend/domain/authentication/sso) flow is very much similar to its [interactive](interactive) counterpart, but, as the name suggests, it doesn't require any interaction from the user.

<!--more-->

When activated, the `Non-interactive` switch changes the behaviour of the SSO authentication. The user won't see any login popup, but the whole process will be executed in the background.

## Initiating the flow

One of the crucial differences with the interactive flow is that the authentication must be triggered externally. There must be some Javascript code added to the page, which activates the SSO flow upon page load by calling the `nonInteractiveSsoLogin()` method of the `<comentario-comments>` HTML element.

## Login redirect in iframe

After calling the above method, Comentario will create a hidden iframe and point it to the SSO URL, providing the following two query parameters:

* `token`, a value consisting of 64 hexadecimal digits representing a user session token, and
* `hmac`, a value consisting of 64 hexadecimal digits, which is a SHA256 HMAC signature of the `token`. The signature is created using the [shared SSO secret](/configuration/frontend/domain/authentication/sso#sso-secret).

## Callback endpoint

The SSO identity provider has to authenticate the user *non-interactively* (for instance, using session cookies) and, once succeeded, redirect the user to Comentario's callback URL (`<Comentario base URL>/api/oauth/sso/callback`), adding the following two query parameters to it:

* `payload` — hexadecimal-encoded payload describing the user (see below), and
* `hmac` — SHA256 HMAC signature of the payload, also created using the shared SSO secret.

Comentario will redeem the login token and remove the hidden iframe.

## Payload

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

