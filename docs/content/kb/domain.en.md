---
title: Domain
description: What is domain object
tags:
    - domain
seeAlso:
    - comment
    - comment-tree
    - domain-page
    - /configuration/embedding
---

The concept of domain is central to Comentario: it is a basic building block.

<!--more-->

A **domain** links comments to a website, providing all necessary website [configuration](/configuration/frontend/domain).

## Host

The most important property of a domain is its **host**, consisting of a **hostname** (also called *domain name*) and an optional **port number**. The chances are you'll never need to specify the port number, since it's mostly meant for testing purposes.

Examples of valid host values:

* `example.com` — only a hostname without port
* `example.com:8080` — hostname with port 8080

## Pages

A domain can own a number of [pages](domain-page), which, in turn, can have a number of [comments](comment).

## Read-only

A domain can be made read-only ("frozen"), which disables adding any new comments on its pages.
