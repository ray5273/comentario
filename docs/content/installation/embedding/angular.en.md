---
title: Angular application
description: How to embed Comentario comments into a single-page Angular app
weight: 1000
tags:
    - installation
    - embedding
    - Angular
    - single-page application
    - SPA
---

{{< callout "warning" "WARNING" >}}
This feature is in the **preview status**. The provided API can (and probably will) change in future releases.
{{< /callout >}}

[Angular](https://angular.io/) is one of the most popular frameworks for building rich single-page web applications.

<!--more-->

We provide an Angular library called [ngx-comentario](https://www.npmjs.com/package/ngx-comentario), which allows for an easy integration with an existing Comentario backend.

1. Navigate to your project, to the directory that contains `package.json`.
2. Add the library as a runtime dependency:
```bash
npm install --save ngx-comentario
```
3. Insert the component into the required template(s) where you want comments to appear, with the correct Comentario backend URL:
```html
...
<ngx-comentario-comments scriptUrl="https://comentario.example.com/comentario.js"></ngx-comentario-comments>
...
```
4. Consult the [library documentation](https://www.npmjs.com/package/ngx-comentario) to learn how to customise the rendered comments.
