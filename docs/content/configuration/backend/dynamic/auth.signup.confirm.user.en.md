---
title: New users must confirm their email
description: auth.signup.confirm.user
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - auth.signup.confirm.commenter
---

This [dynamic configuration](/configuration/backend/dynamic) parameter configures whether users registering via the Administration UI are required to confirm their email before they can log in.

<!--more-->

* If set to `On`, every registering user will receive an email with a confirmation link. They won't be able to log in until the link is clicked (and the email is confirmed).
* If set to `Off`, users can log in immediately upon registration. This is not recommended due to security considerations; it may also render the user account unusable in the future if they misspelled their email address.

This setting applies only to the Administration UI. For websites embedding Comentario there's a [separate configuration item](auth.signup.confirm.commenter).
