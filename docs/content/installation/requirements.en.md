---
title: Requirements
description: What is required for running Comentario
weight: 10
tags:
    - configuration
    - database
    - PostgreSQL
    - SQLite
    - SQLite3
    - Linux
    - Alpine Linux
    - ARM
---

Please read this first: this page explains what you'll need to *self-host* a Comentario instance.

<!--more-->

If you're interested in *building* Comentario from the source code, please refer to [](/installation/building).

## Database

Comentario requires a database for storing comments, users, domain configuration, user sessions etc.

At the time of writing, there are the following two options available: SQLite and PostgreSQL.

### SQLite

SQLite is a file-based local storage mechanism that can simplify Comentario installation: the only thing you'll need is to [specify a location](/configuration/backend/secrets) for the SQLite3 file.

This option has, however, a number of shortcomings:

* It's not scalable: it will probably be okay for up to a few thousand comments, but beyond that the performance will degrade.
* It's not secure: there's no duty separation and no role-based access control, for example, if you want to appoint a DB administrator.
* It's less reliable: in case of OS or system crash, the database may end up in a corrupt state.
* It's not concurrent: you can't look into the DB contents while Comentario is running.

That said, it's probably fine to use SQLite as a minimal option to try out Comentario, or even to use it for your (low traffic) personal blog.

### PostgreSQL

[PostgreSQL](https://www.postgresql.org/) is a dedicated database server, which provides a production-grade persistent storage for systems of any scale, from single-user to those hosting millions of comments.

It doesn't matter where exactly this database is running — on the same machine, on another machine, in the cloud — as long as it's reachable by the Comentario server.

An important thing to consider, however, is the round-trip time to the PostgreSQL server. Any network latency will negatively impact the overall server performance, so it's a good idea to make sure the database network connection is as fast as possible.

#### Supported PostgreSQL versions

As of now, Comentario supports all PostgreSQL versions from **10** up, with **17.x** being the latest available.

Please note, however, that it's usually a good idea to use the latest available software version because of security updates and bug fixes; or, at least, the *latest minor version* of a major version, for the same reason.

## Comentario server

The Comentario server, or the *backend*, currently supports the following architectures:
* `linux_amd64` (Linux x86_64, 64-bit).
* `linux_arm64` (Linux AArch64/ARMv8, 64-bit).
* `linux_armv6` (Linux ARMv6, 32-bit).

Each of these architectures is built twice:
* Statically linked;
* Dynamically linked.

The above flavours are assembled into a number of [binary packages](binary-package) and tarballs: see the [Releases](https://gitlab.com/comentario/comentario/-/releases) page for available artifacts.

The official [Docker builds](/installation/docker-image) are based on Alpine Linux and contain a statically-linked `linux_amd64` binary.

It's also possible to run Comentario on a "full-fledged" Linux variant (such as Ubuntu or Fedora), as well as to link it dynamically against `libc` or `musl` (see [](/installation/building)).
