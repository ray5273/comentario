---
title: Documentation
description: How to translate documentation
weight: 300
tags:
    - contributing
    - i18n
    - internationalisation
    - docs
    - documentation
---

The documentation you're currently reading is also fully translatable thanks to [Hugo multilingual features](https://gohugo.io/content-management/multilingual/).

<!--more-->

However, considering the amount of work required it's even lower priority at this moment than translating the [frontend](frontend).

## Process

The hypothetical procedure for getting the docs translated is as follows.

1. [Fork](https://gitlab.com/comentario/comentario/-/forks/new) the Comentario repository.
2. Register the new language in `docs/hugo.yaml` (see [Hugo docs](https://gohugo.io/content-management/multilingual/) for details).
3. Translate every content page under `docs/content`, naming each file accordingly. For example, `docs/content/about/contact.en.md` becomes `docs/content/about/contact.ru.md`.
4. Commit the work into your fork.
5. Submit a [Merge Request](https://docs.gitlab.com/ee/user/project/merge_requests/) for merging your changes into the `dev` branch.
