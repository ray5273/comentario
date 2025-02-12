---
title: 'Attribute: prefix'
description: The `prefix` attribute of the `<comentario-count>` tag provides text displayed before the number
tags:
    - configuration
    - comments
    - embedding
    - HTML
seeAlso:
    - ../count-tag
    - placeholder
    - suffix
    - error-text
    - zero-text
---

The `prefix` attribute of the [count tag](../count-tag) can be used to prepend the displayed number with a custom string.

<!--more-->

**NB:** when there's also a [zero-text](zero-text) attribute is provided and the number of comments is zero, no prefix is added to the element.

## Example

```html
<h1>Comments<comentario-count prefix=" (" suffix=")"></comentario-count></h1>
```
