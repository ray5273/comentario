---
title: Base URL
description: What is Comentario's base URL
tags:
    - configuration
    - command line
    - base URL
    - REST API
    - API
---

The **base URL** is the root URL Comentario is available at. It must be set correctly in order for your setup to work.

<!--more-->

The value of base URL is provided during the server startup via the [command line](/configuration/backend/static) option `--base-url=` or the equivalent environment variable.

It must include:
* Scheme (usually `https://`);
* Fully-qualified domain name;
* Port number, if it has a non-standard value;
* Full path to Comentario, unless Comentario is available at the root of the site.

For example: `https://my.example.com:8443/comentario`

You can check if the path is correct by opening the URL `<your base URL>/comentario.js`: if the setup is correct, you should get an obfuscated Javascript file. You can further verify its correctness by looking up the following string inside that file:

```js
this.origin="<your base URL>"
```

## Resources and REST API

The base URL will be inserted into the embeddable script (`comentario.js`), as shown above, for fetching other resources (such as messages and styles).

It's also used by the frontends to make REST API calls.
