---
title: Superuser
description: System-wide superuser permission
weight: 10
tags:
    - user
    - permission
    - moderation
    - configuration
    - superuser
seeAlso:
  - roles
---

**Superuser** is a system-wide permission that allows a user to perform any action on this specific Comentario installation.

<!--more-->

That's what distinguishes superuser from [user roles](roles), which define user permissions within a specific domain.

There can be any number of superusers in the system, but it's a good idea to have at least one, because only superusers can do the following:

* Manage [system configuration](/configuration/backend/dynamic).
* Manage (edit, delete, ban) other users.

Also, they can do anything that roles allow: manage domains, moderate comments, etc.

## Creating a superuser

There are the following ways to create a superuser:

1. Superuser privilege can be granted by another superuser.
2. The *first local user* (i.e. one signing up with email and password) registered on the server automatically gets a superuser privilege.
3. Using the `--superuser=<ID-or-email>` [command-line switch](/configuration/backend/static) to turn an existing user into a superuser.
4. Updating the database directly with a UI tool or the following SQL statement (put the correct email below):
```sql
update cm_users set is_superuser = true where email = 'email@address';
```
