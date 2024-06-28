---
title: 'Attribute: live-update'
description: The `live-update` attribute of the `<comentario-comments>` tag disables live comment updates
tags:
    - configuration
    - comments
    - embedding
    - HTML
    - Live update
seeAlso:
    - ../comments-tag
---

The `live-update` attribute of the [comments tag](../comments-tag) controls whether [live updates](/kb/live-update) of comments on the page is enabled.

<!--more-->

* If set to `false`, the Live update is disabled for this particular page.
* If set to `true` or omitted, the Live update is enabled.

{{< callout >}}
This attribute has no effect when live update is disabled [globally on the server](/configuration/backend/static) by passing the `--no-live-update` option.
{{< /callout >}}
