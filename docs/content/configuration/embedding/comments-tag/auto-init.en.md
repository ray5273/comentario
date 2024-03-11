---
title: 'Attribute: auto-init'
description: The `auto-init` attribute of the `<comentario-comments>` tag controls Comentario load
tags:
    - configuration
    - comments
    - embedding
    - HTML
    - JavaScript
seeAlso:
    - ../comments-tag
---

The `auto-init` attribute of the [comments tag](../comments-tag) controls whether the embedded Comentario comments will be rendered automatically upon page load.

<!--more-->

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
