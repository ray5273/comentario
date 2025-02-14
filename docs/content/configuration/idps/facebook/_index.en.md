---
title: Login via Facebook
description: How to configure OAuth2 login via Facebook
weight: 100
tags:
    - configuration
    - identity provider
    - idp
    - authentication
    - OAuth2
    - Facebook
seeAlso:
    - /configuration/backend/secrets
    - /configuration/frontend/domain/authentication
---

To let your users sign in with their **Facebook account**, follow the below steps.

<!--more-->

1. Register a [Meta Developer](https://developers.facebook.com/) account.
2. Navigate to the [Facebook apps](https://developers.facebook.com/apps/) page.
3. Click **Create app**.
4. Choose **Authenticate and request data from users with Facebook Login**, then **Next**:
   {{< imgfig "app-type.png" "" "border shadow" >}}
5. Click **No, I'm not building a game**, then **Next**.
6. Give the application a name and provide a contact email, then click **Create app**:
{{< imgfig "app-details.png" "" "border shadow" >}}
7. Enable the `email` permission:
{{< imgfig "app-customize.png" "" "border shadow" >}}
8. In **Facebook Login settings** (the page shown above), make sure Web OAuth login is enabled, and add the Facebook callback URL `https://<your-comentario-domain>/api/oauth/facebook/callback` as Valid OAuth Redirect URI:
{{< imgfig "facebook-login-settings.png" "" "border shadow" >}}
9. Navigate to **App settings** ⇒ **Basic**. There you'll be able to copy **App ID** and **App secret**. Store them in a safe place for future reference. Also provide additional details ([Privacy policy URL](/legal/privacy), [Data deletion URL](/legal/account-removal)):
{{< imgfig "app-config.png" "" "border shadow" >}}
10. Submit the application for verification.
11. Update the [secrets configuration](/configuration/backend/secrets) with the above data, putting the App ID into `key` and App secret into `secret`:
```yaml
...
idp:
  facebook:
    key:    413690874551549
    secret: 84c8b978cdd0bb3b12d5069fdfac3185
...
```
12. Restart Comentario. You should now see Facebook under **Configured federated identity providers** on the Static configuration page of the Administration UI.
13. Still in the Admin UI, navigate to the desired domain properties and tick off **Facebook** on the [Authentication tab](/configuration/frontend/domain/authentication), then click **Save**.
{{< imgfig "domain-auth.png" "" "border shadow" >}}

That's it! Your users should now be able to login using the **Facebook** button in the Login dialog.
