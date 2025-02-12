---
title: 'Attribute: error-text'
description: The `error-text` attribute of the `<comentario-count>` tag defines text displayed on error
tags:
    - configuration
    - comments
    - embedding
    - HTML
seeAlso:
    - ../count-tag
    - placeholder
    - zero-text
    - prefix
    - suffix
---

The `error-text` attribute of the [count tag](../count-tag) can be used to override the text displayed in the element whenever it encounters a problem with retrieving the data from the server.

<!--more-->

* If `error-text` is omitted, the [count widget](../count-tag) will display a question mark (`?`) should the server request fail.
* If the attribute has a value (which can also be an empty string), that text will be displayed on error instead.

## Example

```html
<p>This page has <comentario-count error-text="???"></comentario-count> comment(s).</p>
```
