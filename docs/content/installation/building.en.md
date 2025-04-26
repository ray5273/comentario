---
title: Building Comentario
description: How to build Comentario from the source code
weight: 200
tags:
    - installation
    - configuration
    - compilation
    - building
    - testing
    - e2e
    - database
    - PostgreSQL
---

This page explains how you can build Comentario **frontend** (UI) and **backend** (server) from its source code.

<!--more-->

## Prerequisites

In order to build Comentario, you'll need a few tools:

* [Go](https://go.dev/) 1.24+
* [go-swagger](https://github.com/go-swagger/go-swagger) 0.31+
* [Node.js](https://nodejs.org/) 20.x
* [Yarn](https://yarnpkg.com/) 1.22+

## Building frontend

1. Install dependencies: `yarn install`
2. Generate the API client code: `yarn run generate`
3. Build the app in:
     * develop mode (with source maps): `yarn run build`
     * production mode (minified): `yarn run build:prod`

## Building backend

In principle, building the backend is as simple as running:

```bash
go generate
go build -o ./build/comentario
```

But of course, there's a lot of nuances when it comes to compiling, such as dynamic/static linking, stripping debug info and so on. You can find more details on that in the `.gitlab-ci.yml` file, which drives the automated build pipeline.

## Running Comentario locally

You can easily build and run the backend in one go, provided you have [Docker](https://www.docker.com/) installed; you'll also need to have its [Compose plugin](https://docs.docker.com/compose/).

Start the comentario server in the end-to-end (*e2e*) testing mode with:

```bash
./scripts/e2e-backend
```

This will do the following:

* Build the `comentario` binary
* Build the `comentario-e2e.so` plugin
* Start a PostgreSQL server in a Docker container
* Start an Nginx HTTP server in a Docker container
* Run the built Comentario server in the e2e-testing mode
* Seed the database with mock data

If everything was successful, the backend will start and connect to the database, then fill it with the seed data.

### Administration console

You can open the Comentario administration console at [localhost:8080](http://localhost:8080) and use one of the following predefined owner users/passwords:

* `ace@comentario.app` / `test`
* `king@comentario.app` / `test`
* `queen@comentario.app` / `test`
* `jack@comentario.app` / `test`

### Test site

You can also open a test site with Comentario-driven comments at [localhost:8000](http://localhost:8000).

Use one of the following predefined commenter users/passwords:

* `one@blog.com` / `user`
* `two@blog.com` / `user`
