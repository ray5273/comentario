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
    - /configuration/embedding/comments-tag/auto-non-interactive-sso
    - /configuration/frontend/domain/authentication/sso
---

Non-interactive [SSO authentication](/configuration/frontend/domain/authentication/sso) flow is very much similar to its [interactive](interactive) counterpart, but, as the name suggests, it doesn't require any interaction from the user.

<!--more-->

When activated, the `Non-interactive` switch changes the behaviour of the SSO authentication. The user won't see any login popup, but the whole process will be executed in the background.

## Triggering non-interactive SSO flow

One of the crucial differences with the interactive flow is that the authentication must be triggered either externally, or automatically by using the [`auto-non-interactive-sso` attribute](/configuration/embedding/comments-tag/auto-non-interactive-sso) — which is by far the simplest way. 

### Triggering externally

If you chose not to enable automatic SSO login by adding `auto-non-interactive-sso="true"`, you'll need to add some code to the page that triggers that process after the page has finished loading. That code should contain a call to the `nonInteractiveSsoLogin()` method of the `<comentario-comments>` HTML element.

Please be mindful of the following:

1. Non-interactive SSO **must be enabled and configured** in the [domain properties](/configuration/frontend/domain/authentication); otherwise, a rejected `Promise` with the string `Non-interactive SSO is not enabled.` will be returned.
2. Comentario **initialisation has to finish** before `nonInteractiveSsoLogin()` can be called; otherwise, a rejected `Promise` with the string `Initialisation hasn't finished yet.` will be returned.

Because of the second item, the only reliable way to trigger SSO login externally is [disabling automatic initialisation](/configuration/embedding/comments-tag/auto-init), then using the `Promise` returned by the `main()` method to synchronise with the init process.

Below is an example of how it might look like:

```html
<comentario-comments id="comments" auto-init="false"></comentario-comments>
<script>
    window.onload = () => {
        const cc = document.getElementById('comments');
        cc.main().then(() => cc.nonInteractiveSsoLogin());
    };
</script>
```

See [below](#noninteractivessologin-method) for more details about the `nonInteractiveSsoLogin()` method.

## Login redirect in iframe

After the SSO login flow is triggered, Comentario will create a hidden iframe and point it to the SSO URL, providing the following two query parameters:

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

## `nonInteractiveSsoLogin()` method

### Synopsis

`nonInteractiveSsoLogin(options?)`

### Return value

`Promise<void>`

The return value can be used to check the outcome of the SSO login process.

### Arguments

* `options` *optional* — Object containing additional options:
    * `force: boolean` — If `true`, the flow will be triggered even if the user is already logged in, in which case a logout sequence will be executed first. If `false`, the call is a no-op in the case the user is signed in.
