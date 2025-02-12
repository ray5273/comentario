---
title: 'Attribute: placeholder'
description: The `placeholder` attribute of the `<comentario-count>` tag specifies the initial content of the element
tags:
    - configuration
    - comments
    - embedding
    - HTML
seeAlso:
    - ../count-tag
    - error-text
    - zero-text
---

The `placeholder` attribute of the [count tag](../count-tag) can be used to specify the text initially displayed in the element.

<!--more-->

* If `placeholder` is omitted, the [count widget](../count-tag) will initially be empty, but if it has a value, the widget will display it instead.
* As soon as the server request has finished, the widget will display:
  * the number of comments, if succeeded, or
  * the text denoted by the [`error-text`](error-text) attribute, if the request failed.

## Example

```html
<p>This page has <comentario-count placeholder="[loading]"></comentario-count> comment(s).</p>
```
