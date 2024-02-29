---
title: New commenters must confirm their email
description: auth.signup.confirm.commenter
tags:
    - configuration
    - dynamic configuration
    - administration
seeAlso:
    - auth.signup.confirm.user
---

This [dynamic configuration](/configuration/backend/dynamic) parameter configures whether users registering on comment pages are required to confirm their email before they can log in.

<!--more-->

* If set to `On`, every registering commenter will receive an email with a confirmation link. They won't be able to log in until the link is clicked (and the email is confirmed).
* If set to `Off`, commenters will be logged in immediately upon registration. This is not recommended due to security considerations; it may also render the user account unusable in the future if they misspelled their email address.

This setting applies only to websites embedding Comentario. For the Administration UI there's a [separate configuration item](auth.signup.confirm.user).
