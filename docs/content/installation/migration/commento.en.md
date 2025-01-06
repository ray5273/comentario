---
title: Migration from Commento(++)
description: How to migrate to Comentario from Commento and Commento++
weight: 200
tags:
    - Commento
    - Commento++
    - Commentoplusplus
    - installation
    - migration
    - upgrade
    - PostgreSQL
---

## Commento

Commento was once a popular open-source commenting system.

It is in fact a predecessor of Comentario, because Comentario 2.x started as a fork to Commento 1.8, reworking the user interface and the internals, but keeping the database structure intact.

<!--more-->

The fact that Comentario 2.x database was 100% compatible with Commento made the [migration](comentario-2.x) very easy: it was basically a drop-in replacement, which only required adjusting some server parameters. It made also a reverse migration possible.

{{< callout >}}
Comentario only supports direct migration from the latest available Commento release: **1.8.0**. More specifically, it expects exactly 30 database migrations installed.
{{< /callout >}}

### Comentario 3

The **version 3** of Comentario is a major step forward: it addresses many inconsistencies and limitations of Commento data model, which slowed down the development of the latter and made solving some issues nearly impossible.

The data model was developed from scratch, and all the constituent components had to be overhauled and rewritten.

We've done our best to make the migration transparent, keeping Comentario "plug-n-play." The database will be automatically migrated on first run.

Contrary to Comentario 2.x, it's a one-way ticket though; once migrated, the original database will be deleted. The only way to revert that is restoring a back-up copy made prior to migration.

## Commento++

Commento++ (a.k.a. Commentoplusplus) was another project stemming from Commento, which tried to resolve its most pressing problems and added some new functionality.

Since its database is very close to the original, it's also possible to directly migrate to Comentario from Commento++.

{{< callout >}}
Comentario only supports direct migration from the latest available Commento++ release: **1.8.7**. More specifically, it expects exactly 33 database migrations installed.
{{< /callout >}}

## Migration steps

{{< callout "warning" "IMPORTANT" >}}
A direct database migration from Commento/Commento++ to Comentario is only possible if you're staying on the same database, i.e. PostgreSQL (the only option for Commento and Commento++).

Migration from PostgreSQL to SQLite can only be done via export and a subsequent import. This path, however, will result in a data loss since not attributes get exported.
{{< /callout >}}

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

[Install](/installation) Comentario and [configure](/configuration/backend/static) it to connect to the same PostgreSQL database Commento used (or a copy of it).

The database should be automatically migrated on the first run. If everything goes smoothly, the server will just run without any error or warning message in the console.

And if you start it with the `-v` command-line switch, you should have seen the following lines in the log:

```
2023/08/20 11:49:38 INFO  persistence Connected to database
2023/08/20 11:49:38 INFO  persistence Discovered 1 database migrations in /comentario/db
2023/08/20 11:49:38 INFO  persistence 0 migrations already installed
2023/08/20 11:49:38 INFO  persistence Successfully installed 1 migrations
```

### 4. Appoint a superuser

Comentario introduces the concept of [superuser](/kb/permissions/superuser): it's essentially an instance admin. Only superusers can manage (edit, ban, delete) other users and change configuration parameters. You'll definitely need at least one for your installation.

There are the following four ways to become a superuser:

1. Superuser privilege can be granted a user by another superuser. It can only work if you already have a superuser.
2. The *first local user* (i.e. one signing up with email and password) registered on the server automatically gets a superuser privilege.
3. Using the `--superuser=<ID-or-email>` [command-line switch](/configuration/backend/static) to turn a user into a superuser.
4. Updating the database directly with a UI tool or the following SQL statement:
```sql
update cm_users set is_superuser = true where email = 'YOUR@EMAIL';
```

Since you're migrating from Commento, you'd probably already have users, so you'll need to use the last two options.

### 5. Update your code snippet

Comentario is embedded on a web page as a [web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components), and not via a `<div>` tag like Commento.

In practice, it only means updating the code snippet you place on your web pages, replacing the `<div>` with `<comentario-comments>`. You can look the snippet up in the Administration console, under `Domain properties` ⇒ `Installation`, and it looks like this:

```html
<script defer src="https://example.com/comentario.js"></script>
<comentario-comments></comentario-comments>
```

If you used [`data-*` attributes](/configuration/embedding#comments-tag), you'll need to change those, too:

* Firstly, they now have to be put on the `<comentario-comments>` tag (not on the `<script>`).
* Secondly, the `data-` prefix should be removed.

There's one exception to the data attributes: `data-hide-deleted`, which Commento used to hide deleted comments, isn't supported by Comentario on the page level. Instead, you can switch off the `Show deleted comments` [configuration parameter](/configuration/backend/dynamic). 
