---
title: RSS feed
description: Comentario provides comment updates via RSS feeds
tags:
    - RSS
    - RSS feed
    - comment
seeAlso:
    - comment
    - comment-tree
    - domain-page
    - /configuration/backend/dynamic/domain.defaults.comments.rss.enabled
---

Comentario allows users to subscribe to comment updates using the so-called [RSS](https://en.wikipedia.org/wiki/RSS) feed. An RSS feed is a specially prepared XML document, which you can add to your RSS reader application or service, to get updates about newly arrived comments on a [domain](domain).

<!--more-->

## Subscribing to RSS

This XML document contains latest comments that match the chosen criteria:

* Across the entire domain or on a specific [page](domain-page);
* Written by or as a reply to a comment by you.

You can subscribe to a comment feed in two places: via the embedded Comentario or in the Administration UI.

### Website with embedded comments

1. Open a [comment thread](comment-tree) on the website you're interested in.
2. Click on the `RSS` button under the `Add a comment` input field.
3. In the popup dialog that appeared, choose the desired criteria.
4. Right click the presented RSS feed link to copy it to the clipboard.
5. Use the copied link for your RSS reader application or service.

**NB:** If you wish to subscribe to *replies to your comments*, you have to be logged in to Comentario on this website, otherwise the corresponding checkbox won't be available.

### Administration UI

You can also find an RSS feed link in the Administration UI once you've logged in:

* To subscribe to comments on a [domain](/kb/domain), navigate to its properties and choose options for the `Comment RSS feed`. You can choose between all comments, comments by you, or comments in reply to your comments.
* Similarly, to subscribe to comments on a specific [domain page](/kb/domain-page), use the RSS link widget in that page properties.

## RSS configuration

If you're [domain owner](/kb/permissions/roles#owner) or a [superuser](/kb/permissions/superuser), you can disable RSS feeds for this specific domain using the [](/configuration/backend/dynamic/domain.defaults.comments.rss.enabled) dynamic configuration parameter.

Every domain has RSS enabled by default.
