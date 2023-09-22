---
title: Roles
description: User domain roles
weight: 20
tags:
    - user
    - role
    - permission
    - moderation
    - configuration
    - owner
    - moderator
    - commenter
    - read-only
seeAlso:
  - superuser
---

A **user domain role**, or just **role** for brevity, defines what actions a user can perform on Comentario *with respect to a specific domain*. For example, a user can be an *Owner* in one domain, but a *Commenter* in another.

<!--more-->

Roles can be assigned in the *Domain users* section of the Administration UI by domain owners or superusers.

Comentario recognises the following roles.

### Owner

The **Owner** role allows a user to fully manage the domain:

* Edit domain properties and configuration (such as authentication and moderation options);
* Perform domain-wide actions (such as importing and exporting comments);
* Delete the domain;
* Manage and moderate domain-specific content (such as pages and comments);
* Manage domain users (including assigning roles) and see their email addresses.
* View domain statistics.

### Moderator

The **Moderator** role allows a user to moderate all comments in the domain: approve, reject, edit, and delete them.

Moderators cannot see other users' email addresses, only names.

### Commenter

The **Commenter** role allows a user to leave comments on domain pages, and edit or delete *own* comments.

This is the **default role** for new users registering on a page with comments.

### Read-only

The **Read-only** role allows a user to read comments, but not to write them. This role is mostly intended for keeping naughty commenters at bay.
