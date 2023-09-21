---
title: Requirements
description: What is required for running Comentario
weight: 10
tags:
    - configuration
    - database
    - PostgreSQL
    - Linux
    - Alpine Linux
    - ARM
---

Please read this first: this page explains what you'll need to *self-host* a Comentario instance.

<!--more-->

If you're interested in *building* Comentario from the source code, please refer to [](/installation/building).

## PostgreSQL

Comentario requires a [PostgreSQL](https://www.postgresql.org/) database instance for storing comments, users, domain configuration etc.

It doesn't matter where exactly this database is running — on the same machine, on another machine, in the cloud — as long as it's reachable by the Comentario server.

An important thing to consider, however, is the round-trip time to the PostgreSQL server. Any network latency will negatively impact the overall server performance, so it's a good idea to make sure the database network connection is as fast as possible.

### Supported PostgreSQL versions

At the time of writing, comentario supports all PostgreSQL versions from **9.6** up, with **15.x** being the latest available.

Please note, however, that it's usually a good idea to use the latest available software version because of security updates and bug fixes; or, at least, the *latest minor version* of a major version, for the same reason.

## Comentario server

The Comentario server, or the *backend*, currently supports (presumably all) **Linux x86_64** flavours.

The official [Docker builds](/installation/docker-image) are based on Alpine Linux and are linked statically.

It's also possible to run Comentario on a "full-fledged" Linux variant (such as Ubuntu or Fedora), as well as to link it dynamically against `libc` or `musl` (see [](/installation/building)).

Support for **Linux ARM** is planned, but we'll need to see if there's enough demand for it.
