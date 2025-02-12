---
title: 'Attribute: suffix'
description: The `suffix` attribute of the `<comentario-count>` tag provides text displayed before the number
tags:
    - configuration
    - comments
    - embedding
    - HTML
seeAlso:
    - ../count-tag
    - placeholder
    - prefix
    - error-text
    - zero-text
---

The `suffix` attribute of the [count tag](../count-tag) can be used to append a custom string to the displayed number.

<!--more-->

**NB:** when there's also a [zero-text](zero-text) attribute is provided and the number of comments is zero, no suffix is added to the element.

## Example

```html
<h1>Comments<comentario-count prefix=" (" suffix=")"></comentario-count></h1>
```
