---
title: Frontend
description: How to translate frontend
weight: 200
tags:
    - contributing
    - i18n
    - internationalisation
    - frontend
    - Administration UI
---

Although there's already a built-in support for translating the frontend, this feature is considered low-priority at the moment and hence not available yet.

<!--more-->

You can [submit an issue](https://gitlab.com/comentario/comentario/-/issues) if you believe it's important.

## Process

The hypothetical procedure for getting the frontend translated is as follows.

1. [Fork](https://gitlab.com/comentario/comentario/-/forks/new) the Comentario repository.
2. Register the new language in `frontend/angular.json` (under `projects.comentario.i18n.locales`).
3. Translate all messages following the [Angular i18n guide](https://angular.io/guide/i18n-overview).
4. Commit the work into your fork.
5. Submit a [Merge Request](https://docs.gitlab.com/ee/user/project/merge_requests/) for merging your changes into the `dev` branch.

