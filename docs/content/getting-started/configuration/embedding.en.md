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
<script defer src="https://example.com/comentario.js"></script>
<comentario-comments></comentario-comments>
```

As you can see, it consists of two tags: a `<script>` and a `<comentario-comments>`.

### Script tag

The `<script>` tag provides the entire commenting functionality, including comment layout, content, and styling.

### Comments tag

The `<comentario-comments>` tag is a [web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) that provides the comment functionality. It marks the location for displayed comments.

After Comentario engine is initialised, the comments will appear inside the `<comentario-comments>` tag — as well as the profile bar, comment editor, and other relevant elements.

You can further customise Comentario by adding attributes to the `<comentario-comments>` tag:

{{< table "table table-narrow table-striped" >}}

| Attribute      | Description                                                                    | Default value |
|----------------|--------------------------------------------------------------------------------|---------------|
| `auto-init`    | Whether to automatically initialise Comentario                                 | `true`        |
| `css-override` | Additional CSS stylesheet URL, or `false` to disable loading styles altogether |               |
| `no-fonts`     | Set to `true` to avoid applying default Comentario fonts                       | `false`       |
| `page-id`      | Overrides the path (URL) of the current page                                   |               |
{{< /table >}}

Example of a customised `<comentario-comments>` tag:

```html
<comentario-comments auto-init="false" 
                     css-override="https://example.com/custom.css" 
                     no-fonts="true" 
                     page-id="/blog/post/123"></comentario-comments>
```

#### Manual initialisation

If you disabled automatic initialisation by adding `auto-init="false"`, you'll need to initialise Comentario manually. Here's a simple example:

```html
<comentario-comments id="comments"></comentario-comments>
<script>
    window.onload = function() {
      document.getElementById('comments').main();
    };
</script>
```

