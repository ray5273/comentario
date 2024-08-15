---
title: Architecture
description: The internal structure and components of Comentario
tags:
    - about
    - architecture
    - backend
    - server
    - frontend
    - Administration UI
    - REST API
    - API
seeAlso:
  - /configuration/embedding
---

Comentario is, in a nutshell, a classic client-server system consisting of a backend (server part) and two frontends (client parts, both running in the user's browser).

It can schematically be depicted as follows:

<!--more-->

{{< imgfig "schematics.png" "Comentario schematics diagram." >}}

## Backend

As you can see on the diagram above, the **backend**, or the server part, consists of a Comentario server and a [database](/installation/requirements).

* The **database** is used to store users, comments, [instance settings](/configuration/backend/dynamic), and other persistent data.
* The **Comentario server** discloses *static data* (such as HTML, Javascript, and CSS files) and provides an {{< abbr "API" "Application Programming Interface" >}} to the frontends (client applications), which is used to transfer data to and from the server.

Comentario server is connected to the Internet, however usually not directly: most of the time there's an intermediate component providing SSL/TLS encryption. Without it, all the sensitive data (such as passwords and authentication tokens) would be transmitted in clear text.

It's also possible to provide a TLS certificate to the server using [command-line flags](/configuration/backend/static) and expose the server to the Internet directly, but it's usually more involved when it comes to the initial setup and certificate renewal.

## Administration UI

The **Administration UI** is a full-blown, rich web application written in [Angular](https://angular.dev/).

When the user navigates to the root path (specified by the [](/kb/base-url)):
1. The user gets redirected to the appropriate language version (only `/en/`, English, available at the moment).
2. The browser downloads Comentario Javascript and styling (CSS) files from the backend.
3. The browser starts the Admin UI web application.
4. The application connects to the Comentario server using the REST API it provides.

The Admin UI is available for all registered Comentario users, however the set of available pages depend on the user's [permissions](/kb/permissions).

For example:

* A regular user (*commenter*) will only see [domains](/kb/domain) they commented on and only their own comments, whereas
* A [superuser](/kb/permissions/superuser) will see all domains registered on the server, as well as every comment on them.

## Embedded comments

* The **embedded comments** are rendered using the [`<comentario-comments>`](/configuration/embedding/comments-tag) HTML tag.
* The tag is registered in the browser as a [web component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) by `comentario.js` [script](/configuration/embedding/script-tag) downloaded from the server.

For the component to work properly, Comentario also needs:

* A stylesheet file (`comentario.css`), and
* [Localised messages](/contributing/i18n/backend), used for displaying pieces of text in the embedded Comentario.

Both of the above also get downloaded from the server during script startup.

After the initialisation phase successfully finished, the embedded Comentario fetches a [comment tree](/kb/comment-tree) using an API call, renders it, and continues to update it in response to user actions and [Live update](/kb/live-update) messages.
