---
title: Hugo static website
description: How to integrate Comentario comments with a website built in Hugo
weight: 1000
tags:
    - installation
    - embedding
    - Hugo
    - static website
---

[Hugo](https://gohugo.io/) is a popular, powerful static website generator written in Go *(also used to build this documentation by the way)*.

<!--more-->

1. Look up the [HTML snippet](/configuration/embedding) in you domain properties.
2. Create a comment *partial template* in `layouts/partials/comments.html`:
```html
<!-- Your HTML snippet goes here -->
<script defer src="https://example.com/comentario.js"></script>
<comentario-comments></comentario-comments>
```
3. Reference this partial template in the appropriate template located under `layouts`. For example, `layouts/_default/single.html`:
```html
{{ define "main" }}
<main>
    <!-- Main content -->
    {{ .Content }}

    <!-- Comentario comments -->
    {{- partial "comments" . }}
</main>
{{ end }}
```
Adjust the above code as you see fit.
