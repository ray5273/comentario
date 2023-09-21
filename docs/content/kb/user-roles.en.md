---
title: User roles
description: What a user role is and how it defines a user's permissions
tags:
    - user
    - role
    - permission
    - moderation
    - configuration
    - superuser
    - owner
    - moderator
    - commenter
    - read-only
---

There are two kinds of permissions in Comentario: **superuser** and **role**.

<!--more-->

## Superuser

**Superuser** is an instance-wide permission that allows a user to perform any action in this specific Comentario system.

There can be any number of superusers in the system, but it's a good idea to have at least one, because only superusers can do the following:

* Manage instance configuration.
* Manage (edit, delete, ban) other users.

Also, they can do anything that roles allow: manage domains, moderate comments, etc.

There are the following ways to create a superuser:

1. Superuser privilege can be granted by another superuser.
2. The *first local user* (i.e. one signing up with email and password) registered on the server automatically gets a superuser privilege.
3. Using the `--superuser=<ID-or-email>` [command-line switch](/configuration/server) to turn an existing user into a superuser.
4. Updating the database directly with a UI tool or the following SQL statement (put the correct email below):
```sql
update cm_users set is_superuser = true where email = 'email@address';
```

## Roles

A **role** defines what actions a user can perform on Comentario *with respect to a specific domain*. For example, a user can be an *Owner* in one domain, but a *Commenter* in another.

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
