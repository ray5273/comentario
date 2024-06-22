---
title: Login via Google
description: How to configure OAuth2 login via Google
weight: 100
tags:
    - configuration
    - identity provider
    - idp
    - authentication
    - OAuth2
    - Google
seeAlso:
    - /configuration/backend/secrets
    - /configuration/frontend/domain/authentication
---

To let your users sign in with their **Google account**, follow the below steps.

<!--more-->

1. Register a [Google Developer](https://developers.google.com/) account.
2. Navigate to [Google Cloud console](https://console.cloud.google.com/).
3. Go to **APIs and services** ⇒ **Credentials**.
4. Click **Create credentials** in the top toolbar, then choose **OAuth client ID**:
   {{< imgfig "add-credentials.png" "" "border shadow" >}}
5. Configure the application:
    * Choose **Web application** as application type and give it a name.
    * Add your Comentario domain as authorised JavaScript origin.
    * Add Google callback URL `https://<your-comentario-domain>/api/oauth/google/callback` as authorised redirect URI.
6. Click **Create**:
{{< imgfig "app-config.png" "" "border shadow" >}}
7. You will be presented the two values: the **Client ID** and the **Client secret**. Store them in a safe place for future reference:
{{< imgfig "oauth-client-created.png" "" "border shadow" >}}
8. Update the [secrets configuration](/configuration/backend/secrets) with the above data:
```yaml
...
idp:
  google:
    key:    1036387968558-f005cfkbt9c15a4hcu65vetb0j0h0p4a.apps.googleusercontent.com
    secret: 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
...
```
9. Restart Comentario. You should now see Google under **Configured federated identity providers** on the Static configuration page of the Administration UI.
10. Still in the Admin UI, navigate to the desired domain properties and tick off **Google** on the [Authentication tab](/configuration/frontend/domain/authentication), then click **Save**.
{{< imgfig "domain-auth.png" "" "border shadow" >}}

That's it! Your users should now be able to login using the **Google** button in the Login dialog.
