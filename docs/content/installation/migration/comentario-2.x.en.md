---
title: Migration from 2.x
description: How to upgrade to Comentario 3 from a 2.x version
weight: 100
tags:
    - Commento
    - Comentario 2.x
    - installation
    - migration
    - upgrade
    - PostgreSQL
---

This page explains how you can migrate to Comentario version 3 from a 2.x installation.

<!--more-->

The most important part of the migration is the database conversion, which happens automatically on the first run. This process is irreversible; once migrated, the original database will be deleted. The only way to revert that is making a back-up copy prior to migration.

{{< callout "warning" "IMPORTANT" >}}
A direct database migration from Comentario 2.x to 3.x is only possible if you're staying on the same database, i.e. PostgreSQL (the only option for 2.x). Migration from PostgreSQL to SQLite can only be done via export and a subsequent import.
{{< /callout >}}

## Migration steps

### 1. Back up your data

{{< callout "warning" "VERY IMPORTANT" >}}
Always make a backup of your original database!
{{< /callout >}}

The migration can fail, go wrong, or wipe the original data. This is especially true due to the quirks of the original Commento data model.

### 2. Check your backup

{{< callout "warning" "ALSO VERY IMPORTANT" >}}
Make sure the backup you made can be restored. A non-restorable backup is as useless as a non-existent one.
{{< /callout >}}

### 3. Deploy Comentario

[Install](/installation) the new version over the existing one: the exact steps will depend on how your Comentario is installed.

The database should be automatically migrated on the first run. If everything goes smoothly, the server will just run without any error or warning message in the console.

And if you start it with the `-v` command-line switch, you should have seen the following lines in the log:

```
2023/08/20 11:49:38 INFO  persistence Connected to database
2023/08/20 11:49:38 INFO  persistence Discovered 1 database migrations in /comentario/db
2023/08/20 11:49:38 INFO  persistence 0 migrations already installed
2023/08/20 11:49:38 INFO  persistence Successfully installed 1 migrations
```

### 4. Appoint a superuser

The 3.x Comentario version introduces the concept of [superuser](/kb/permissions/superuser): it's essentially an instance admin. Only superusers can manage (edit, ban, delete) other users and change configuration parameters. You'll definitely need at least one for your installation.

There are the following four ways to become a superuser:

1. Superuser privilege can be granted a user by another superuser. It can only work if you already have a superuser.
2. The *first local user* (i.e. one signing up with email and password) registered on the server automatically gets a superuser privilege.
3. Using the `--superuser=<ID-or-email>` [command-line switch](/configuration/backend/static) to turn a user into a superuser.
4. Updating the database directly with a UI tool or the following SQL statement:
```sql
update cm_users set is_superuser = true where email = 'YOUR@EMAIL';
```

If you migrated from an existing Comentario install, you'd probably already have users, so you'll need to use the last two options. 

### 5. Update your Comentario snippet

Comentario 3 is embedded on a web page as a [web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components), and not via a `<div>` tag as before.

In practice, it only means updating the code snippet you place on your web pages, replacing the `<div>` with `<comentario-comments>`. You can look the snippet up in the Administration console, under `Domain properties` ⇒ `Installation`, and it looks like this:

```html
<script defer src="https://example.com/comentario.js"></script>
<comentario-comments></comentario-comments>
```

If you used [`data-*` attributes](/configuration/embedding#comments-tag), you'll need to change those, too:

* Firstly, they now have to be put on the `<comentario-comments>` tag (not on the `<script>`).
* Secondly, the `data-` prefix should be removed.
