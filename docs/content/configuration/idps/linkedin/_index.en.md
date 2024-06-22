---
title: Login via LinkedIn
description: How to configure OAuth2 login via LinkedIn
weight: 100
tags:
    - configuration
    - identity provider
    - idp
    - authentication
    - OAuth2
    - OIDC
    - OpenID Connect
    - LinkedIn
seeAlso:
    - /configuration/backend/secrets
    - /configuration/frontend/domain/authentication
    - /configuration/idps/oidc
---

To let your users sign in with their **LinkedIn account**, you'll have to configure an [OIDC](../oidc) identity provider by following the below steps.

<!--more-->
https:://www.linkedin.com/company/comentario-app/
1. Register as a [LinkedIn developer](https://developer.linkedin.com/).
2. Navigate to [My Apps ⇒ Create app](https://www.linkedin.com/developers/apps/new).
3. Configure the application, by providing an app name, a LinkedIn page URL, [Privacy policy](/legal/privacy) URL, and a logo:
   {{< imgfig "app-new.png" "" "border shadow" >}}
4. On the Products tab, in the **Sign In with LinkedIn using OpenID Connect** block, click **Request access**:
   {{< imgfig "product-signin.png" "" "border shadow" >}}
5. Agree to the Terms, and you'll see the **Sign In** under **Added products**.
6. Go to the **Auth** tab:
    1. Note the **Client ID** and the **Primary Client Secret** and store them in a safe place for future reference.
    2. Under OAuth 2.0 settings, click on the pencil icon.
    3. Add the following redirect URL: `https://<your-comentario-domain>/api/oauth/oidc:linkedin/callback`:
   {{< imgfig "app-auth.png" "" "border shadow" >}}
7. Update the [secrets configuration](/configuration/backend/secrets) with the above data:
```yaml
...
idp:
 oidc:
  - id:     linkedin
    name:   LinkedIn
    url:    https://www.linkedin.com/oauth/
    scopes:
     - openid
     - profile
     - email
    key:    78d26udw82x728
    secret: OfveFNVVm2l3Dkkd
...
```
8. Restart Comentario. You should now see LinkedIn under **Configured federated identity providers** on the Static configuration page of the Administration UI.
9. Still in the Admin UI, navigate to the desired domain properties and tick off **LinkedIn** on the [Authentication tab](/configuration/frontend/domain/authentication), then click **Save**.
  {{< imgfig "domain-auth.png" "" "border shadow" >}}

That's it! Your users should now be able to login using the **LinkedIn** button in the Login dialog.
