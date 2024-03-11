---
title: 'Attribute: lang'
description: The `lang` attribute of the `<comentario-comments>` tag controls language for the embedded comments
tags:
    - configuration
    - comments
    - embedding
    - HTML
    - i18n
    - language
seeAlso:
    - ../comments-tag
---

The `lang` attribute of the [comments tag](../comments-tag) specifies the language that should be used for the embedded Comentario comments.

<!--more-->

Its value is an [ISO 639 code](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes). If the attribute is omitted, Comentario will try to look it up on the current page by querying its `<html>` element for the `lang` attribute.

For the language to actually be selected, it has to be one of the values listed under `Configuration` ⇒ `Static`. Otherwise, Comentario will fall back to the global default: `en` (English).
