---
title: 'Attribute: page-id'
description: The `page-id` attribute of the `<comentario-comments>` tag indicates the page path within the domain
tags:
    - configuration
    - comments
    - embedding
    - HTML
seeAlso:
    - ../comments-tag
---

The `page-id` attribute of the [comments tag](../comments-tag) can be used to provide a mapping between path(s) and a page that displays embedded comments.

<!--more-->

{{< callout >}}
This attribute is a misnomer (inherited from Commento), because the value of `page-id` must be *a path* under the page's [domain](/kb/domain).
{{< /callout >}}

Comentario uses it for the following two purposes:

1. As the page's identifier indicating which comments belong to that page, and
2. As the actual page's path, used, for instance, to create a link to the comment in email notifications.

Because it's an *identifier*, it must uniquely represent the page. Multiple pages with the same identifier will share the same comment thread.

And since it's also a *path*, it has to start with a slash (`/`) and resolve to a real URL — if necessary, by adding a redirect.

## Use cases

This is most useful (or even required) in situations when you can't simply rely on the page URL to render its comments:

* You have a multilingual website that has several versions of the same page, and you want all of them to share the same comments, for instance `htpps://example.com/en/product/123` and `htpps://example.com/fr/product/123`.
* Your website applies query parameters that are completely irrelevant for rendering comments, such as `htpps://example.com/product/123?session-id=0e6e74d4-13f9-49e1-9049-91e40c185c17`.
* The page URL doesn't change at the right moment or at all, for example, in a single-page application (SPA). Comentario will "snapshot" the URL on [initialisation](auto-init), and ignore any subsequent changes to it.
