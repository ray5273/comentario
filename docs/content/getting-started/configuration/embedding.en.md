---
title: Embedding comments
description: How to add comments to a web page by embedding Comentario
tags:
    - configuration
    - comments
    - embedding
---

The whole point of [installing](/getting-started/installation) Comentario is, of course, using it as a *web comment engine*.

<!--more-->

Or, in other words, its ability to add comment threads to web pages.

## Adding comments to a web page

In order to add (*embed*) comments to your website, you'll need to do the following:

1. Register a new *domain* in the admin console.
2. Add an HTML snippet to every web page that's supposed to have comment functionality.

The HTML snippet is displayed in domain properties and looks like this:

```html
<script defer src="https://example.com/js/comentario.js"></script>
<div id="comentario"></div>
```

As you can see, it consists of two tags: a `<script>` and a `<div>`.

### Script tag

The `<script>` tag provides the entire commenting functionality, including comment layout, content, and styling.

The script tag allows for further customisation of comments on the page by extending it with `data-*`-attributes.

{{< table "table table-narrow table-striped" >}}

| Attribute           | Description                                            | Default value |
|---------------------|--------------------------------------------------------|---------------|
| `data-page-id`      | Overrides the path (URL) of the current page           |               |
| `data-css-override` | URL of an additional CSS stylesheet to load            |               |
| `data-auto-init`    | Whether to automatically initialise Comentario         | `true`        |
| `data-id-root`      | ID of root `<div>` HTML element for embedding comments | `comentario`  |
| `data-no-fonts`     | Whether to avoid applying default Comentario fonts     | `false`       |
| `data-hide-deleted` | Whether to hide deleted comments on the page           | `false`       |
{{< /table >}}

### Div tag

The `<div>` element is merely an *insertion point*, which marks the location for displayed comments. After Comentario engine is initialised, its content gets replaced by comments, new comment editor, and other relevant elements.

By default, it has to have the `id="comentario"`, but this can be overridden by using the `data-id-root` attribute (see above).
