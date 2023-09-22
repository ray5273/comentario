---
title: Domain
description: What is domain object
tags:
    - domain
---

The concept of domain is central to Comentario, it is a basic building block of the comment engine.

<!--more-->

A **domain** binds comments to a website, providing all necessary website [configuration](/configuration/frontend/domain).

## Host

The most important property of a domain is its **host**, consisting of a **hostname** (also called *domain name*) and an optional **port number**. The chances are you'll never need to specify the port number, since it's mostly meant for testing purposes.

Examples of valid host values:

* `example.com` — only a hostname without port
* `example.com:8080` — hostname with port 8080
