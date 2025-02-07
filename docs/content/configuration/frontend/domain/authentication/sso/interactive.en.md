---
title: Interactive SSO
description: The interactive SSO authentication flow
weight: 10
tags:
    - configuration
    - frontend
    - Administration UI
    - domain
    - authentication
    - SSO
    - Single Sign-On
seeAlso:
    - non-interactive
    - multiple-domains
    - /configuration/frontend/domain/authentication/sso
---

Interactive [SSO authentication](/configuration/frontend/domain/authentication/sso) flow means it's triggered by the user and requires them to do something in the popup window that appears. What exactly, depends on the SSO provider being used.

<!--more-->

## Initiating the flow

The interactive SSO flow is initiated either by clicking the `Single Sign-On` button in the Login dialog, or immediately upon clicking `Login` in the profile bar, if SSO is *the only available [authentication method](/configuration/frontend/domain/authentication)*.

## Login redirect

After clicking the SSO login button, the user will be redirected to the SSO URL, enriched with the following two query parameters:

* `token`, a value consisting of 64 hexadecimal digits representing a user session token, and
* `hmac`, a value consisting of 64 hexadecimal digits, which is a SHA256 HMAC signature of the `token`. The signature is created using the [shared SSO secret](/configuration/frontend/domain/authentication/sso#sso-secret).

## Callback endpoint

The SSO identity provider has to authenticate the user and, once succeeded, redirect the user to Comentario's callback URL (`<Comentario base URL>/api/oauth/sso/callback`), adding the following two query parameters to it:

* `payload` — hexadecimal-encoded payload describing the user (see below), and
* `hmac` — SHA256 HMAC signature of the payload, also created using the shared SSO secret.

## Payload

The payload value holds a JSON-formatted user data, providing the following properties:

* `token`, which must be the same value that was passed during the initial SSO call;
* `email`, specifying the user's email address;
* `name`, providing the user's full name;
* `photo`, an optional user avatar URL;
* `link`, an optional user profile or website URL.
* `role`, an optional [role](/kb/permissions/roles) to give to the user on this specific domain, one of [`owner`, `moderator`, `commenter`, `readonly`]. If not provided, any *new user* will be assigned the default `commenter` role, and any *existing user* will keep their role unchanged.

For example:

```json
{
  "token": "0a3577213987d24993ef20d335f7b9769c1d1719b40767c6948d6c3882403a96",
  "email": "johndoe@example.com",
  "name": "John Doe"
}
```
