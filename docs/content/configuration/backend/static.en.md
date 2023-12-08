---
title: Static configuration
description: Comentario command-line and environment configuration
weight: 10
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

The static, or start-up, configuration of Comentario server can be set using command-line options or environment variables. Both methods are equivalent, with command-line options taking precedence.

<!--more-->

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

| Option                      | Description                                                           | Environment variable | Default value                 |
|-----------------------------|-----------------------------------------------------------------------|----------------------|-------------------------------|
| `-h`, `--help`              | Show help message (option summary) and exit                           |                      |                               |
| `--cleanup-timeout=VALUE`   | Grace period for which to wait before killing idle connections        |                      | `10s`                         |
| `--graceful-timeout=VALUE`  | Grace period for which to wait before shutting down the server        |                      | `15s`                         |
| `--max-header-size=VALUE`   | Maximum number of bytes to read for request header (not request body) |                      | `1MiB`                        |
| `--socket-path=VALUE`       | The unix socket to listen on                                          |                      | `/var/run/comentario.sock`    |
| `--host=VALUE`              | The IP to listen on                                                   | `$HOST`              | `localhost`                   |
| `--port=VALUE`              | The port to listen on                                                 | `$PORT`              | Random port number            |
| `--listen-limit=VALUE`      | Limits the number of outstanding requests                             |                      |                               |
| `--keep-alive=VALUE`        | Sets the TCP keep-alive timeouts on accepted connections              |                      | `3m`                          |
| `--read-timeout=VALUE`      | Maximum duration before timing out read of the request                |                      | `30s`                         |
| `--write-timeout=VALUE`     | Maximum duration before timing out write of the response              |                      | `60s`                         |
| `-v`, `--verbose`           | Verbose logging (use `-vv` for debug logging)                         |                      |                               |
| `--base-url=VALUE`          | Server's own base URL                                                 | `$BASE_URL`          | `http://localhost:8080`       |
| `--base-docs-url=VALUE`     | Base documentation URL                                                | `$BASE_DOCS_URL`     | `https://docs.comentario.app` |
| `--cdn-url=VALUE`           | Static file CDN URL                                                   | `$CDN_URL`           | The base URL                  |
| `--email-from=VALUE`        | 'From' address in sent emails                                         | `$EMAIL_FROM`        | `noreply@localhost`           |
| `--db-idle-conns=VALUE`     | Max. number of idle DB connections                                    | `$DB_MAX_IDLE_CONNS` | `50`                          |
| `--disable-xsrf`            | Disable XSRF protection (for development purposes only)               |                      |                               |
| `--enable-swagger-ui`       | Enable Swagger UI at `/api/docs`                                      |                      |                               |
| `--static-path=VALUE`       | Path to static files                                                  | `$STATIC_PATH`       | `.`                           |
| `--db-migration-path=VALUE` | Path to DB migration files                                            | `$DB_MIGRATION_PATH` | `.`                           |
| `--db-debug`                | Enable database debug logging                                         |                      |                               |
| `--template-path=VALUE`     | Path to template files                                                | `$TEMPLATE_PATH`     | `.`                           |
| `--secrets=VALUE`           | Path to YAML file with secrets                                        | `$SECRETS_FILE`      | `secrets.yaml`                |
| `--superuser=VALUE`         | UUID or email of a user to become a superuser                         | `$SUPERUSER`         |                               |
| `--log-full-ips`            | Log IP addresses in full                                              | `LOG_FULL_IPS`       |                               |
| `--home-content-url=VALUE`  | URL of a HTML page to display on homepage                             | `HOME_CONTENT_URL`   |                               |
| `--gitlab-url=VALUE`        | Custom GitLab URL for authentication                                  | `$GITLAB_URL`        |                               |
| `--e2e`                     | Start server in end-to-end testing mode                               |                      |                               |
{{< /table >}}
