---
title: 'Attribute: zero-text'
description: The `zero-text` attribute of the `<comentario-count>` tag provides text displayed when there's no comment
tags:
    - configuration
    - comments
    - embedding
    - HTML
seeAlso:
    - ../count-tag
    - error-text
    - prefix
    - suffix
---

The `zero-text` attribute of the [count tag](../count-tag) can be used to override the text displayed in the element when its value is `0`.

<!--more-->

When the comment count returned by the server is zero:

* If `zero-text` is omitted, the [count widget](../count-tag) will display a literal zero (`0`) combined with any [prefix](prefix) and/or [suffix](suffix) values.
* If the attribute has a value (which can also be an empty string), that text will be displayed instead, and no prefix or suffix used.

## Example

```html
<p>This page has <comentario-count zero-text="no"></comentario-count> comment(s).</p>
```
