---
title: Secrets
description: Secrets configuration
weight: 20
tags:
    - configuration
    - backend
    - server
    - secrets
    - database
    - PostgreSQL
    - SQLite
    - SQLite3
    - SMTP
    - identity provider
    - idp
    - email
    - authentication
    - spam detection
    - Facebook
    - GitHub
    - GitLab
    - Google
    - Twitter
    - X
    - Akismet
    - Perspective
    - APILayer
    - extension
seeAlso:
    - /configuration/idps/facebook
    - /configuration/idps/github
    - /configuration/idps/gitlab
    - /configuration/idps/google
    - /configuration/idps/twitter
---

Comentario stores its sensitive data in a YAML file called *secrets*. The secrets file is a part of [static backend configuration](static).

<!--more-->

The main reason for choosing this approach was that a separate *secrets* file can easily be deployed and connected to Comentario running in a [Docker container](/installation/docker-image) or [Kubernetes cluster](/installation/helm-chart).

The file is a regular YAML file; it doesn't necessarily need to be named `secrets.yaml`, but it's the default name unless [configured](static) otherwise.

## Secrets file reference

There's a sample [secrets.postgres.yaml](https://gitlab.com/comentario/comentario/-/blob/master/resources/k8s/secrets.postgres.yaml) file in Comentario [git repository](/about/source-code), which you can (and should) use as a starting point for your production configuration.

Below is a summary of the values in the secrets file.

<div class="table-responsive">

| Key                                           | Type    | Description                                                                                   |    Default value    |
|-----------------------------------------------|---------|-----------------------------------------------------------------------------------------------|:-------------------:|
| **Database**                                  |         |                                                                                               |                     |
| `postgres.host`                               | string  | Hostname or IP address of PostgreSQL DB                                                       |                     |
| `postgres.port`                               | integer | Port number of PostgreSQL DB                                                                  |       `5432`        |
| `postgres.database`                           | string  | Name of the PostgreSQL database                                                               |                     |
| `postgres.username`                           | string  | Username to connect to PostgreSQL                                                             |                     |
| `postgres.password`                           | string  | Password to connect to PostgreSQL                                                             |                     |
| `postgres.sslmode`                            | string  | SSL mode for PostgreSQL (`disable`, `allow`, `prefer`, `require`, `verify-ca`, `verify-full`) |      `disable`      |
| `sqlite3.file`                                | string  | Path to the SQLite3 database file                                                             |                     |
| **SMTP server**                               |         |                                                                                               |                     |
| `smtpServer.host`                             | string  | Hostname or IP address of SMTP server. Required for emailing to work                          |                     |
| `smtpServer.port`                             | integer | Port number of SMTP server                                                                    |  `587` (STARTTLS)   |
| `smtpServer.username`                         | string  | Username to connect to SMTP server                                                            |                     |
| `smtpServer.password`                         | string  | Password to connect to SMTP server                                                            |                     |
| `smtpServer.encryption`                       | string  | Encryption used for sending mails: `none`, `ssl`, `tls`                                       | Derived from `port` |
| `smtpServer.insecure`                         | boolean | Whether to skip SMTP server's SSL certificate verification                                    |       `false`       |
| **[Identity providers](/configuration/idps)** |         |                                                                                               |                     |
| `idp.facebook.disable`                        | boolean | Whether to forcefully disable Facebook authentication                                         |                     |
| `idp.facebook.key`                            | string  | Client ID for Facebook authentication                                                         |                     |
| `idp.facebook.secret`                         | string  | Client secret for Facebook authentication                                                     |                     |
| `idp.github.disable`                          | boolean | Whether to forcefully disable GitHub authentication                                           |                     |
| `idp.github.key`                              | string  | Client ID for GitHub authentication                                                           |                     |
| `idp.github.secret`                           | string  | Client secret for GitHub authentication                                                       |                     |
| `idp.gitlab.disable`                          | boolean | Whether to forcefully disable GitLab authentication                                           |                     |
| `idp.gitlab.key`                              | string  | Client ID for GitLab authentication                                                           |                     |
| `idp.gitlab.secret`                           | string  | Client secret for GitLab authentication                                                       |                     |
| `idp.google.disable`                          | boolean | Whether to forcefully disable Google authentication                                           |                     |
| `idp.google.key`                              | string  | Client ID for Google authentication                                                           |                     |
| `idp.google.secret`                           | string  | Client secret for Google authentication                                                       |                     |
| `idp.twitter.disable`                         | boolean | Whether to forcefully disable Twitter/X authentication                                        |                     |
| `idp.twitter.key`                             | string  | Client ID for Twitter/X authentication                                                        |                     |
| `idp.twitter.secret`                          | string  | Client secret for Twitter/X authentication                                                    |                     |
| **Extensions**                                |         |                                                                                               |                     |
| `extensions.akismet.disable`                  | boolean | Whether to globally disable Akismet API                                                       |                     |
| `extensions.akismet.key`                      | string  | Akismet API key                                                                               |                     |
| `extensions.perspective.disable`              | boolean | Whether to globally disable Perspective API                                                   |                     |
| `extensions.perspective.key`                  | string  | Perspective API key                                                                           |                     |
| `extensions.apiLayerSpamChecker.disable`      | boolean | Whether to globally disable APILayer SpamChecker API                                          |                     |
| `extensions.apiLayerSpamChecker.key`          | string  | APILayer SpamChecker API key                                                                  |                     |
{.table .table-striped}
</div>

## Database

The only mandatory settings in the above table concern database configuration: Comentario requires a database for data storage.

* If `postgres.host` is specified, **PostgreSQL database** will be used. Then you'll also need to provide `postgres.database`, `postgres.username`, and `postgres.password`.
* Otherwise, Comentario will use a local, file-based **SQLite3** database: you have to specify a complete file path in `sqlite3.file`. If the file doesn't exist, it will be created, but the path must exist and be writable.

## Email sending

Comentario can optionally send notification emails. In order for this to work, SMTP server settings need to be specified:

* If `smtpServer.host` is not provided, no emails will be sent.
* If `smtpServer.username` is not provided, Comentario will try to connect to the SMTP server without authentication.

## External identity providers

Comentario supports *federated authentication* via [external identity providers](/configuration/idps), such as Google and Facebook.

* If no configuration is given for a federated identity provider, this provider will not be available for user authentication.
* If you want to (temporarily) disable a fully-configured identity provider, set its `disable` flag to `true`.

## Extensions

Comentario supports external comment-checking services called [extensions](/configuration/frontend/domain/extensions).

* If no extension (Akismet, Perspective, etc.) API key is provided, this extension will *still be available for users*, but they will need to [configure](/configuration/frontend/domain/extensions) the key on the domain level in order to activate it.
* To disable an extension altogether, set its `disable` flag to `true`.

## Example

### SQLite

Here's an example of a minimal `secrets.yaml` file to use a local file-based database:

```yaml
sqlite3:
  file: /tmp/my-comentario.db
```

**WARNING: this is just an example!** The `/tmp` directory usually gets cleaned on each reboot, so you'll lose all data. 

### PostgreSQL

Another example of a minimal `secrets.yaml` file for connecting to PostgreSQL:

```yaml
postgres:
  host:     127.0.0.1
  database: comentario
  username: postgres
  password: postgres
```
