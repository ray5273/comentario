---
title: Comments tag
description: The `<comentario-comments>` tag is required to embed comments on a page
weight: 20
tags:
    - configuration
    - comments
    - embedding
    - HTML
    - i18n
    - language
    - Live update
seeAlso:
    - ../script-tag
    - /configuration/frontend/domain/authentication/sso
---

The `<comentario-comments>` tag is the second required element on a comment page (with the [script tag](../script-tag) being the first). It represents a [web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) that provides the comment functionality.

<!--more-->

This tag marks the location for displayed comments.

After Comentario engine is initialised, the comments will appear inside the corresponding HTML element — as well as the profile bar, comment editor, and other relevant elements.

## Customising the comments

You can further customise Comentario by adding attributes to the `<comentario-comments>` tag. You can use the `Options` button next to the snippet to open the option editor.

Comentario recognises the following tag attributes:

<div class="table-responsive">

| Attribute                                              | Description                                                                    | Default value         |
|--------------------------------------------------------|--------------------------------------------------------------------------------|-----------------------|
| [`auto-init`](auto-init)                               | Whether to automatically initialise Comentario                                 | `true`                |
| [`auto-non-interactive-sso`](auto-non-interactive-sso) | Whether to automatically trigger non-interactive SSO authentication            | `false`               |
| [`css-override`](css-override)                         | Additional CSS stylesheet URL, or `false` to disable loading styles altogether |                       |
| [`lang`](lang)                                         | Language for the embedded Comentario                                           | Page language or `en` |
| [`live-update`](live-update)                           | Whether [Live update](/kb/live-update) of comments is enabled on the page      | `true`                |
| [`max-level`](max-level)                               | Maximum comment visual nesting level. Set to `1` to disable nesting altogether | `10`                  |
| [`no-fonts`](no-fonts)                                 | Set to `true` to avoid applying default Comentario fonts                       | `false`               |
| [`page-id`](page-id)                                   | Overrides the path (URL) of the current page                                   |                       |
| [`theme`](theme)                                       | Colour theme to render Comentario in                                           | OS colour theme       |
{.table .table-striped}
</div>

Below is an example of a customised `<comentario-comments>` tag:

```html
<comentario-comments auto-init="false"
                     auto-non-interactive-sso="true"
                     css-override="https://example.com/custom.css"
                     lang="ru"
                     live-update="false"
                     max-level="5"
                     no-fonts="true" 
                     page-id="/blog/post/123"
                     theme="dark"></comentario-comments>
```
