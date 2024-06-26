---
title: 'Attribute: theme'
description: The `theme` attribute of the `<comentario-comments>` tag specifies the colour scheme to use
tags:
    - configuration
    - comments
    - embedding
    - HTML
    - CSS
    - styling
seeAlso:
    - ../comments-tag
    - css-override
---

The `theme` attribute of the [comments tag](../comments-tag) can be used to change the default Comentario appearance for embedded comments.

<!--more-->

* Possible values for this attribute are `light` (the default) and `dark`.
* If this attribute is omitted, the default OS/browser colour theme is used: `dark` when dark mode is active, otherwise `light`.

The colour theme defines the colour palette used; comment appearance can be further fine-tuned by defining [custom CSS styles](css-override).

The `theme` setting will have no effect when `css-override` is set to `false`.
