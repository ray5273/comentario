---
title: Docker image
description: Comentario provides ready-for-use Docker images.
---

Comentario automated build pipeline creates and uploads Docker images to [GitLab Container Registry](https://gitlab.com/comentario/comentario/container_registry).

There are the following two sorts of Docker images.

## Release builds

Every tagged commit (usually on the `master` branch) produces an image tagged with the corresponding version. For example, version `v2.2.2` can be run with:

```bash
docker run registry.gitlab.com/comentario/comentario:v2.2.2
```

## Edge builds

Every commit on the `dev` branch produces an image tagged with the branch and the commit hash. You can run, for example:

```bash
docker run registry.gitlab.com/comentario/comentario:dev-073c0b88
```
