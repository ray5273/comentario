---
title: Allow users to update their emails
description: auth.emailUpdate.enabled
tags:
    - configuration
    - dynamic configuration
    - administration
    - Administration UI
seeAlso:
    - auth.signup.enabled
    - domain.defaults.signup.enablelocal
---

This [dynamic configuration](/configuration/backend/dynamic) parameter defines whether local users (i.e. those authenticated with email and password) are allowed to change their emails.

<!--more-->

* If set to `On`, local users can request a change of email address in their profile:
  * If your Comentario instance has an operational mailer configured, the user will receive an email at the new address, with a confirmation link to complete the change.
  * If no operational mailer is configured, the email will be updated right away, without intermediate confirmation.
* If set to `Off`, users cannot change their emails themselves. Email can only be updated by a [superuser](/kb/permissions/superuser) (for example, at a user's request).

