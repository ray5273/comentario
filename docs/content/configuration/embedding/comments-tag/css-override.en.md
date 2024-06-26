---
title: 'Attribute: css-override'
description: The `css-override` attribute of the `<comentario-comments>` tag allows to override comment styling
tags:
    - configuration
    - comments
    - embedding
    - HTML
    - CSS
    - styling
seeAlso:
    - ../comments-tag
    - theme
---

The `css-override` attribute of the [comments tag](../comments-tag) can be used to change or disable standard Comentario styles for embedded comments.

<!--more-->

Its value can be:

* A string specifying URL of a custom CSS stylesheet. It will be downloaded and applied *after* the standard Comentario stylesheet (`comentario.css`), thus overriding any default styles.
* `false`, in which case all standard styling will be disabled. To get comments to work, you will need to include a link to a *compatible stylesheet* on your page. This is far from trivial: you can have a look at the [SCSS directory](https://gitlab.com/comentario/comentario/-/tree/dev/embed/scss?ref_type=heads) for details.
