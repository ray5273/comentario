---
title: Server configuration
description: Comentario command-line and environment configuration
weight: 100
tags:
    - configuration
    - secrets
    - CLI
    - command line
    - environment
    - IP
    - logging
    - debug
---

Comentario server can be configured in two ways:

<!--more-->

* Using command-line options;
* Using environment variables.

## Command-line help

Some command-line options have an equivalent setting in the form of an environment variable. You can get a complete list of supported options and variables by running:

```bash
./comentario -h
```

## Usage

```bash
comentario [OPTIONS]
```

## Options

Below is a list of available command-line options, with their environment equivalents.

{{< table "table table-striped" >}}

| Option                      | Description                                                           | Environment variable | Default value              |
|-----------------------------|-----------------------------------------------------------------------|----------------------|----------------------------|
| `--cleanup-timeout=VALUE`   | Grace period for which to wait before killing idle connections        |                      | `10s`                      |
| `--graceful-timeout=VALUE`  | Grace period for which to wait before shutting down the server        |                      | `15s`                      |
| `--max-header-size=VALUE`   | Maximum number of bytes to read for request header (not request body) |                      | `1MiB`                     |
| `--socket-path=VALUE`       | The unix socket to listen on                                          |                      | `/var/run/comentario.sock` |
| `--host=VALUE`              | The IP to listen on                                                   | `$HOST`              | `localhost`                |
| `--port=VALUE`              | The port to listen on                                                 | `$PORT`              | Random port number         |
| `--listen-limit=VALUE`      | Limits the number of outstanding requests                             |                      |                            |
| `--keep-alive=VALUE`        | Sets the TCP keep-alive timeouts on accepted connections              |                      | `3m`                       |
| `--read-timeout=VALUE`      | Maximum duration before timing out read of the request                |                      | `30s`                      |
| `--write-timeout=VALUE`     | Maximum duration before timing out write of the response              |                      | `60s`                      |
| `-v`, `--verbose`           | Verbose logging (use `-vv` for debug logging)                         |                      |                            |
| `--base-url=VALUE`          | Server's own base URL                                                 | `$BASE_URL`          | `http://localhost:8080/`   |
| `--cdn-url=VALUE`           | Static file CDN URL                                                   | `$CDN_URL`           | The base URL               |
| `--email-from=VALUE`        | 'From' address in sent emails                                         | `$EMAIL_FROM`        | `noreply@localhost`        |
| `--db-idle-conns=VALUE`     | Max. number of idle DB connections                                    | `$DB_MAX_IDLE_CONNS` | `50`                       |
| `--enable-swagger-ui`       | Enable Swagger UI at `/api/docs`                                      |                      |                            |
| `--static-path=VALUE`       | Path to static files                                                  | `$STATIC_PATH`       | `.`                        |
| `--db-migration-path=VALUE` | Path to DB migration files                                            | `$DB_MIGRATION_PATH` | `.`                        |
| `--template-path=VALUE`     | Path to template files                                                | `$TEMPLATE_PATH`     | `.`                        |
| `--secrets=VALUE`           | Path to YAML file with secrets                                        | `$SECRETS_FILE`      | `secrets.yaml`             |
| `--allow-new-owners`        | Allow new owner signups                                               | `$ALLOW_NEW_OWNERS`  |                            |
| `--gitlab-url=VALUE`        | Custom GitLab URL for authentication                                  | `$GITLAB_URL`        |                            |
| `--e2e`                     | Start server in end-to-end testing mode                               |                      |                            |
| `-h`, `--help`              | Show help message (option summary) and exit                           |                      |                            |
{{< /table >}}
