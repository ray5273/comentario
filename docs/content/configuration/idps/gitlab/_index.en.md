---
title: Login via GitLab
description: How to configure OAuth2 login via GitLab
weight: 100
tags:
    - configuration
    - identity provider
    - idp
    - authentication
    - OAuth2
    - GitLab
seeAlso:
    - /configuration/backend/secrets
    - /configuration/frontend/domain/authentication
---

To let your users sign in with their **GitLab account**, follow the below steps.

<!--more-->

1. Go to your GitLab account, then navigate to **Settings ⇒ Applications**.
2. Click **Add new application**:
   {{< imgfig "app-list.png" "" "border shadow" >}}
3. Fill in application details:
    * Application name
    * Redirect URI: set to `https://<your-comentario-domain>/api/oauth/gitlab/callback`
    * Enable **Confidential**
    * Enable the **read_user** scope
      {{< imgfig "app-settings.png" "" "border shadow" >}}
4. Click **Save application**: you'll be presented an Application ID and a Secret. Store them in a safe place for future reference:
   {{< imgfig "app-secret.png" "" "border shadow" >}}
5. Click **Continue**.
6. Update the [secrets configuration](/configuration/backend/secrets) with the above data, putting the **Application ID** into `key` and the **Secret** into `secret`:
```yaml
...
idp:
  gitlab:
    key:    a5d56d29e8ca6e7529db59d8dbf465f849249d25e9c23eed123df4ab8dfe394a
    secret: gloas-1500310db5b494903117945ac7a20cfec423e7e34fa0c2fcd337e1dafc3ee957
...
```
7. Restart Comentario. You should now see GitLab under **Configured federated identity providers** on the Static configuration page of the Administration UI.
8. Still in the Admin UI, navigate to the desired domain properties and tick off **GitLab** on the [Authentication tab](/configuration/frontend/domain/authentication), then click **Save**.
{{< imgfig "domain-auth.png" "" "border shadow" >}}

That's it! Your users should now be able to login using the **GitLab** button in the Login dialog.
