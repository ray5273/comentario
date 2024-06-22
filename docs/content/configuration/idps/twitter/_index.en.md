---
title: Login via Twitter/X
description: How to configure OAuth2 login via Twitter (a.k.a. "X")
weight: 100
tags:
    - configuration
    - identity provider
    - idp
    - authentication
    - OAuth2
    - Twitter
    - X
seeAlso:
    - /configuration/backend/secrets
    - /configuration/frontend/domain/authentication
---

To let your users sign in with their **Twitter (X) account**, follow the below steps.

<!--more-->

1. Log in to the [Twitter Developer portal dashboard](https://developer.twitter.com/en/portal/dashboard).
2. Click on **Create Project** and choose a project name:
{{< imgfig "project-settings-1.png" "" "border shadow" >}}
3. Click **Next** and select the appropriate use case:
{{< imgfig "project-settings-2.png" "" "border shadow" >}}
4. Click **Next** and enter project description:
{{< imgfig "project-settings-3.png" "" "border shadow" >}}
5. After clicking **Next** you'll enter the **Application properties** screen:
{{< imgfig "app-settings-1.png" "" "border shadow" >}}
6. Click **Next** once again and you'll be presented API keys. Store them in a safe place for future reference:
{{< imgfig "app-settings-2.png" "" "border shadow" >}}
7. In app details, under **User authentication settings**, click **Set up**:
{{< imgfig "app-details.png" "" "border shadow" >}}
8. Enter the following settings:
    * App permissions: **Read**, also enable **Request email from users**
      {{< imgfig "app-auth-1.png" "" "border shadow" >}}
    * Type of App: **Web App, Automated App or Bot**
      {{< imgfig "app-auth-2.png" "" "border shadow" >}}
    * Callback URI: `https://<your-comentario-domain>/api/oauth/twitter/callback`
    * Fill in other fields appropriately, then click **Save**:
      {{< imgfig "app-auth-3.png" "" "border shadow" >}}
9. Update the [secrets configuration](/configuration/backend/secrets) with the above data (**API Key** and **API Key Secret**; Bearer Token is not used):
```yaml
...
idp:
  twitter:
    key:    HgcP46jXCRbouchsgqJgkHPZF
    secret: Bqd7r8TaS5bcFReV7bcE2YQMt4xIrwrFSaUQ8KVJENk7JndSxV
...
```
10. Restart Comentario. You should now see Twitter under **Configured federated identity providers** on the Static configuration page of the Administration UI.
11. Still in the Admin UI, navigate to the desired domain properties and tick off **Twitter** on the [Authentication tab](/configuration/frontend/domain/authentication), then click **Save**.
    {{< imgfig "domain-auth.png" "" "border shadow" >}}

That's it! Your users should now be able to login using the **Twitter** button in the Login dialog.
