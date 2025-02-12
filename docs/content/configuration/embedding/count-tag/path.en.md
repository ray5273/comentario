---
title: 'Attribute: path'
description: The `path` attribute of the `<comentario-count>` tag specifies the page to display comment count for
tags:
    - configuration
    - comments
    - embedding
    - HTML
seeAlso:
    - ../count-tag
    - error-text
    - ../comments-tag
    - ../comments-tag/page-id
---

The `path` attribute of the [count tag](../count-tag) can be used to specify a different page to display the number of comments for.

<!--more-->

When `path` is omitted, the [count widget](../count-tag) will display the number of comments *on the current page*. To display a number for a different page, you need to specify the path of that page in this attribute. The path must start with a `/` and correspond to the actual page path within a [domain](/kb/domain).

See the [page-id](../comments-tag/page-id) comment tag attribute for more details.

## Example

```html
<p>This page has <comentario-count></comentario-count> comment(s).</p>
<p>But our home page has <comentario-count path="/"></comentario-count> comment(s).</p>
```
