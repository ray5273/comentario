---
title: Comments tag
description: The `<comentario-comments>` tag is required to embed comments on a page
weight: 20
tags:
    - configuration
    - comments
    - embedding
    - HTML
seeAlso:
    - script-tag
    - /configuration/frontend/domain/authentication/sso
---

The `<comentario-comments>` tag is the second required element on a comment page (with the [script tag](script-tag) being the first). It represents a [web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) that provides the comment functionality.

<!--more-->

This tag marks the location for displayed comments.

After Comentario engine is initialised, the comments will appear inside the corresponding HTML element — as well as the profile bar, comment editor, and other relevant elements.

## Customising the comments

You can further customise Comentario by adding attributes to the `<comentario-comments>` tag:

{{< table "table table-narrow table-striped" >}}

| Attribute      | Description                                                                    | Default value |
|----------------|--------------------------------------------------------------------------------|---------------|
| `auto-init`    | Whether to automatically initialise Comentario                                 | `true`        |
| `css-override` | Additional CSS stylesheet URL, or `false` to disable loading styles altogether |               |
| `max-level`    | Maximum comment visual nesting level. Set to `1` to disable nesting altogether | `10`          |
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

## Manual initialisation

If you disabled automatic initialisation by adding `auto-init="false"`, you need to initialise Comentario manually by calling the `main()` method of the web component. Here's a simple example:

```html
<comentario-comments id="comments"></comentario-comments>
<script>
    window.onload = function() {
      document.getElementById('comments').main();
    };
</script>
```

Calling `main()` initialises Comentario. Repeated calls will re-initialise the web component, erasing and filling the comments from scratch.
