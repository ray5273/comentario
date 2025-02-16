---
title: Enable comment RSS feeds
description: domain.defaults.comments.rss.enabled
tags:
    - configuration
    - dynamic configuration
    - administration
    - RSS
seeAlso:
    - /kb/rss
---

This [dynamic configuration](/configuration/backend/dynamic) parameter controls whether comment [RSS feeds](/kb/rss) are enabled on a given domain.

<!--more-->

* When set to `On`, user will be able to request and subscribe to RSS feeds that provide latest comments for the domain.
* If set to `Off`, RSS functionality for this domain is forbidden.

When RSS is enabled, the users will be able to subscribe to comment feeds using:

* `RSS` dropdown button under the [comment editor](/kb/comment-editor) (left of the sorting buttons).
* `Comment RSS feed` links in Domain properties and Domain page properties.
