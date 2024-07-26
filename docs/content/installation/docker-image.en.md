---
title: Docker image
description: Comentario provides ready-for-use Docker images
weight: 110
tags:
    - installation
    - Docker
    - Ubuntu
    - Alpine
---

Comentario automated build pipeline creates and uploads Docker images to [GitLab Container Registry](https://gitlab.com/comentario/comentario/container_registry).

<!--more-->

There are two sort of Docker images: *releases* and *edge builds*. Each of them comes in the following two flavours:

* Using **Alpine Linux 3** as base;
* Using **Ubuntu 24.04 LTS** as base base.

## Release builds

Every tagged commit (usually on the `master` branch) produces an image tagged with the corresponding version. For example, version `v3.8.0` can be run with:

```bash
docker run registry.gitlab.com/comentario/comentario:v3.8.0         # Alpine-based
docker run registry.gitlab.com/comentario/comentario:v3.8.0-ubuntu  # Ubuntu-based
```

The latest release build is also tagged as `latest` (which is Docker's default tag), so running the below command will pull the latest released Comentario version:

```bash
docker run registry.gitlab.com/comentario/comentario                # Alpine-based
docker run registry.gitlab.com/comentario/comentario:latest-ubuntu  # Ubuntu-based
```

## Edge builds

Every commit on the `dev` branch produces an image tagged with the branch and the commit hash. You can run, for example:

```bash
docker run registry.gitlab.com/comentario/comentario:dev-073c0b88         # Alpine-based
docker run registry.gitlab.com/comentario/comentario:dev-073c0b88-ubuntu  # Ubuntu-based
```

The very latest `dev` build is also tagged as `edge`, so running the below command will pull the latest *unstable* Comentario version:

```bash
docker run registry.gitlab.com/comentario/comentario:edge         # Alpine-based
docker run registry.gitlab.com/comentario/comentario:edge-ubuntu  # Ubuntu-based
```
