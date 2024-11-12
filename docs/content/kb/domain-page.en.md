---
title: Domain page
description: What is domain page object
tags:
    - domain
    - domain page
seeAlso:
    - comment
    - comment-tree
    - domain
    - /configuration/embedding
---

A **domain page** represents a website page on a certain [domain](domain). A page corresponds to a specific URL.

<!--more-->

This URL consists of two parts:

* **Host**, which comes from the page's [domain](domain);
* **Path**, always starting with a forward slash ("`/`").

For example, `https://example.com/blog/post/id/0722` is a domain page with host `example.com` and path `/blog/post/id/0722`.

## Title

Page can have a title, which is filled automatically by fetching the page and looking for the document's `<title>` tag. Domain moderator can trigger a page title refresh in Page properties. 

## Read-only

A page can be made read-only, which disables adding new comments on the corresponding website page.

## Comments

Each page has an own [comment tree](comment-tree), displayed when comments are [embedded](/configuration/embedding) on a page.

It's also possible to view comments across all pages of a domain in the Administration UI.
