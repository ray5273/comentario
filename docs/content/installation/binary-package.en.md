---
title: Binary package
description: How to install Comentario locally from a binary package.
weight: 90
tags:
    - installation
    - configuration
    - binary package
    - database
    - PostgreSQL
    - SQLite
    - SQLite3
---

This page explains how you can install Comentario locally using a binary package.

<!--more-->

## Prerequisites

* Your system has [systemd](https://systemd.io/), because Comentario runs as a systemd service.
* *Optional:* [PostgreSQL](requirements#postgresql) is installed and running, and the required database is created.

## Installation

* Download a `.deb` or `.rpm` binary package from the [releases page](https://gitlab.com/comentario/comentario/-/releases).
* Run `dpkg` or `rpm` to install the package.

## Configuration

Upon installation, Comentario (`comentario.service`) will start with all the default configuration, which may not be entirely correct.

The default configuration assumes:

* Comentario is using a local, [file-based SQLite3 database](requirements#database) for storing comments, users, statistics etc. The database file will be created at `/var/lib/comentario/comentario.sqlite3`.
* Comentario is listening on `localhost` port `80`.

Feel free to make necessary changes:

* Edit the file `/etc/comentario/comentario.conf` containing the [static configuration](/configuration/backend/static) (as environment variables).
* Edit the [secrets](/configuration/backend/secrets) in `/etc/comentario/secrets.yaml`. Make sure the file is only readable by `root` (has `0600` permissions).

Then restart the service:

```bash
sudo systemctl restart comentario.service
```

Read more on configuring the backend [here](/configuration/backend).
