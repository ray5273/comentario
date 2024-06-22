---
title: Login via GitHub
description: How to configure OAuth2 login via GitHub
weight: 100
tags:
    - configuration
    - identity provider
    - idp
    - authentication
    - OAuth2
    - GitHub
seeAlso:
    - /configuration/backend/secrets
    - /configuration/frontend/domain/authentication
---

To let your users sign in with their **GitHub account**, follow the below steps.

<!--more-->

1. Go to [GitHub Developer Settings ⇒ OAuth Apps](https://github.com/settings/developers).
2. Click **New OAuth App**.
3. Fill in application details:
    * Application name
    * Homepage URL
    * Application description
    * Authorization callback URL: set to `https://<your-comentario-domain>/api/oauth/github/callback`
4. You'll see a new generated **Client ID**: store it someplace safe.
5. Click **Generate a new client secret**: you'll see a new secret key. Also store it in a safe place for future reference:
   {{< imgfig "app-settings.png" "" "border shadow" >}}
6. Update the [secrets configuration](/configuration/backend/secrets) with the above data, putting the **Client ID** into `key` and **Client secret** into `secret`:
```yaml
...
idp:
  github:
    key:    66fbad1ba1286d8a57c2
    secret: fd4ab7cd07dc55477420cd74093a0490126d038d
...
```
7. Restart Comentario. You should now see GitHub under **Configured federated identity providers** on the Static configuration page of the Administration UI.
8. Still in the Admin UI, navigate to the desired domain properties and tick off **GitHub** on the [Authentication tab](/configuration/frontend/domain/authentication), then click **Save**.
{{< imgfig "domain-auth.png" "" "border shadow" >}}

That's it! Your users should now be able to login using the **GitHub** button in the Login dialog.
