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

{{< table "table table-narrow table-striped" >}}

| Attribute                                                      | Description                                                                       | Default value         |
|----------------------------------------------------------------|-----------------------------------------------------------------------------------|-----------------------|
| [`auto-init`](/configuration/embedding/comments-tag/auto-init) | Whether to automatically initialise Comentario                                    | `true`                |
| `css-override`                                                 | Additional CSS stylesheet URL, or `false` to disable loading styles altogether    |                       |
| [`lang`](/configuration/embedding/comments-tag/lang)           | Language for the embedded Comentario                                              | Page language or `en` |
| `live-update`                                                  | Set to `false` to disable [live updates](/kb/live-update) of comments on the page | `true`                |
| `max-level`                                                    | Maximum comment visual nesting level. Set to `1` to disable nesting altogether    | `10`                  |
| `no-fonts`                                                     | Set to `true` to avoid applying default Comentario fonts                          | `false`               |
| `page-id`                                                      | Overrides the path (URL) of the current page                                      |                       |
{{< /table >}}

**NB:** it's recommended to set `live-update` to `false` when live update is disabled [globally on the server](/configuration/backend/static) (see `--no-live-update`) to reduce network utilization and unburden the browser.

Below is an example of a customised `<comentario-comments>` tag:

```html
<comentario-comments auto-init="false" 
                     css-override="https://example.com/custom.css"
                     lang="ru"
                     live-update="false"
                     max-level="5"
                     no-fonts="true" 
                     page-id="/blog/post/123"></comentario-comments>
```
