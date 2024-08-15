---
title: Live update
description: Comentario allows for live comment updates
tags:
    - about
    - features
    - embedding
    - Live update
---

Comentario supports the so-called **Live update** — a mechanism that delivers new or updated comments on the page that is already open, without the need to reload the page.

<!--more-->

## WebSocket connections

The Live update mechanism is built upon the [WebSocket technology](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) supported by all modern browsers. It allows for two-way communication between the server and the browser.

Comentario utilizes WebSocket connections for delivering comment updates directly into the browser, almost instantaneously.

It supports almost all applicable comment changes:

* New comment is added;
* Comment text is updated;
* Comment is deleted;
* Comment is approved or rejected by a moderator;
* Comment is (un)stickied.

Page- and domain-wide changes (such as domain operations) are not (yet) supported by Live update.

## Settings

The Live update mechanism is controlled by two settings:

* Globally via a [static config](/configuration/backend/static) item. It's on, unless `--no-live-update` is passed on the command line.
* On every page via the `live-update` attribute of the [comments tag](/configuration/embedding/comments-tag). Again, it's on by default.

Additionally, Comentario administrator can limit the number of simultaneous WebSocket connections to prevent server memory exhaustion by specifying the `--ws-max-clients` [command-line option](/configuration/backend/static). Its default value is `10000`.

Clients trying to connect in excess of the imposed limit won't be able to use Live update, but will otherwise operate exactly the same way.
