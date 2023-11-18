---
title: Embedding comments
description: How to add comments to a web page by embedding Comentario
weight: 100
tags:
    - configuration
    - comments
    - embedding
    - HTML
seeAlso:
    - /configuration/backend
    - /configuration/frontend
    - /configuration/frontend/domain
---

The whole point of [installing](/installation) Comentario is, of course, using it as a *web comment engine*.

<!--more-->

Or, in other words, its ability to add comment threads to web pages.

## Adding comments to a web page

In order to add (*embed*) comments to your website, you'll need to do the following:

1. Register a new [domain](/configuration/frontend/domain) in the [Administration UI](/configuration/frontend).
2. Add an HTML snippet to every web page that's supposed to have comment functionality.

The HTML snippet is displayed in domain properties and looks like this:

```html
<script defer src="https://example.com/comentario.js"></script>
<comentario-comments></comentario-comments>
```

As you can see, it consists of two tags: a `<script>` and a `<comentario-comments>`.
