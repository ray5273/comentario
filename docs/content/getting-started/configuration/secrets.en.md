---
title: Secrets
description: Secrets configuration
weight: 200
tags:
    - configuration
    - secrets
    - database
    - PostgreSQL
    - SMTP
    - identity provider
    - email
    - authentication
    - spam detection
    - GitHub
    - GitLab
    - Google
    - Twitter
    - Akismet
---

Comentario stores its sensitive data in a YAML file called *secrets*.

<!--more-->

The main reason for choosing this approach was that a separate *secrets* file can easily be deployed and connected to Comentario running in a [Docker container](/getting-started/installation/docker-image) or [Kubernetes cluster](/getting-started/installation/helm-chart).

The file is a regular YAML file; it doesn't necessarily need to be named `secrets.yaml`, but it's the default name unless [configured](server) otherwise.

## Secrets file reference

There's a sample [secrets.yaml](https://gitlab.com/comentario/comentario/-/blob/master/k8s/secrets.yaml) file in Comentario [git repository](/about/source-code), which you can (and should) use as a starting point for your production configuration.

Below is a summary of the values in the secrets file.

{{< table "table table-striped" >}}

| Key                   | Type    | Required | Description                              | Default value |
|-----------------------|---------|:--------:|------------------------------------------|:-------------:|
| `postgres.host`       | string  |    ✔     | Hostname or IP address of PostgreSQL DB  |               |
| `postgres.port`       | integer |          | Port number of PostgreSQL DB             |    `5432`     |
| `postgres.database`   | string  |    ✔     | Name of the PostgreSQL database          |               |
| `postgres.username`   | string  |    ✔     | Username to connect to PostgreSQL DB     |               |
| `postgres.password`   | string  |    ✔     | Password to connect to PostgreSQL DB     |               |
| `postgres.sslmode`    | string  |          | SSL mode when connecting to Postgres DB  |   `disable`   |
| `smtpServer.host`     | string  |          | Hostname or IP address of SMTP server    |               |
| `smtpServer.port`     | integer |          | Port number of SMTP server               |               |
| `smtpServer.username` | string  |          | Username to connect to SMTP server       |               |
| `smtpServer.password` | string  |          | Password to connect to SMTP server       |               |
| `idp.github.key`      | string  |          | Client ID for GitHub authentication      |               |
| `idp.github.secret`   | string  |          | Client secret for GitHub authentication  |               |
| `idp.gitlab.key`      | string  |          | Client ID for GitLab authentication      |               |
| `idp.gitlab.secret`   | string  |          | Client secret for GitLab authentication  |               |
| `idp.google.key`      | string  |          | Client ID for Google authentication      |               |
| `idp.google.secret`   | string  |          | Client secret for Google authentication  |               |
| `idp.twitter.key`     | string  |          | Client ID for Twitter authentication     |               |
| `idp.twitter.secret`  | string  |          | Client secret for Twitter authentication |               |
| `akismet.key`         | string  |          | Akismet API key                          |               |
{{< /table >}}

As you can see above, only the database configuration is mandatory, and the rest is optional:

* If no SMTP server configuration is provided, no emails will be sent by Comentario.
* If no configuration provided for a federated identity provider (Twitter, Google, etc.), this provider will not be available for user authentication.
* If no Akismet API key is provided, spam detection will be disabled.
