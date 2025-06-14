---
title: Docker playground
description: You can easily try Comentario out with Docker 
weight: 100
tags:
    - getting started
    - Docker
---

The easiest way to give Comentario a spin is using [Docker with its Compose plugin](https://docs.docker.com/compose/install/linux/). You won't need anything else to try it out.

<!--more-->

You will need to create the following two files.

* `docker-compose.yml`:
```yaml
version: '3'

services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: comentario
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"

  app:
    image: registry.gitlab.com/comentario/comentario
    command:
      - "--scheme=https"
      - "--tls-cert=/etc/letsencrypt/live/example.com/fullchain.pem"
      - "--tls-key=/etc/letsencrypt/live/example.com/privkey.pem"
      - "-v"
    environment:
      BASE_URL: https://example.com:8443/
      SECRETS_FILE: "/secrets.yaml"
      TLS_PORT: 8443
      TLS_HOST: 0.0.0.0
    ports:
      - "8443:8443"
    volumes:
      - ./secrets.yaml:/secrets.yaml:ro
      - /etc/letsencrypt/:/etc/letsencrypt/:ro
```
* `secrets.yaml` (find more details in [](/configuration/backend/secrets)):
```yaml
postgres:
  host:     db
  port:     5432
  database: comentario
  username: postgres
  password: postgres
```

The two files must reside in the same directory. Then, start the database and the backend using:


```bash
docker compose up
```

Comentario will be reachable at [https://example.com:8443](https://example.com:8443). Just navigate to [Sign up](https://example.com:8443/en/auth/signup) and register with any email and password: you'll become a [superuser](/kb/permissions/superuser) and will be able to configure the server and add domains in the UI.
