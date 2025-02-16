---
title: Count tag
description: The `<comentario-count>` tag inserts a widget displaying the number of comments on a page
weight: 20
tags:
    - configuration
    - comments
    - embedding
    - HTML
seeAlso:
    - ../script-tag
    - ../comments-tag
---

The `<comentario-count>` tag represents an optional widget that displays the number of comments on the current or any other specified page.

<!--more-->

Like the "main" [comments tag](../comments-tag), it also requires a [script tag](../script-tag) being added to the same page, and it's also a [web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components).

This tag marks the location for the displayed comment count. After Comentario engine is initialised, the comment count will appear inside the corresponding HTML element.

## Customising the element

You can further customise this element by adding attributes to the `<comentario-count>` tag. Available attributes are summarised in the table below.

<div class="table-responsive">

| Attribute                    | Description                                                | Default value               |
|------------------------------|------------------------------------------------------------|-----------------------------|
| [`error-text`](error-text)   | Text to display if fetching the count fails for any reason | `"?"`                       |
| [`path`](path)               | Path (URL) of the page to display comment count for        | Current page's path         |
| [`placeholder`](placeholder) | Text to display before the count becomes available         | `""`                        |
| [`prefix`](prefix)           | Text that prefixes a successfully fetched, non-zero count  | `""`                        |
| [`suffix`](suffix)           | Text that suffixes a successfully fetched, non-zero count  | `""`                        |
| [`zero-text`](zero-text)     | Text to display if count is zero                           | `prefix` + `"0"` + `suffix` |
{.table .table-striped}
</div>

Here's an example of a customised `<comentario-count>` tag:

```html
<comentario-count path="/blog/post/123" 
                  placeholder="..."
                  error-text="ERR"
                  zero-text=""
                  prefix="("
                  suffix=")"></comentario-count>
```
