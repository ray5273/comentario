---
title: Extensions
description: Extensions domain settings
weight: 40
tags:
    - configuration
    - frontend
    - Administration UI
    - domain
    - extension
    - spam
    - toxicity
    - moderation
seeAlso:
    - /configuration/frontend/domain
    - /configuration/frontend/domain/moderation
    - /configuration/backend/secrets
---

The `Extensions` tab provides configuration for domain extensions. **Extensions** are external services that can be used for inspecting comments for spam or toxic content (such as insults or threats).

<!--more-->

## Configuration

* Extension configuration is provided per-domain, in the form of linebreak-separated `key=value` pairs.
* Empty lines and lines starting with a `#` are ignored.
* An extension can be enabled for the domain unless it's explicitly disabled in the [static system configuration](/configuration/backend/secrets).

Also, an extension typically needs an API key registered on the corresponding service. The API key can be provided in two ways:

* Globally, in the [secrets config](/configuration/backend/secrets).
* Locally (per-domain), in the extension configuration field as the `apiKey` value.

{{< warning >}}
The extension won't be used if neither global nor local API key is provided.
{{< /warning >}}

All other parameters are extension-specific, read the corresponding extensions documentation for details.

## Available extensions

Comentario supports the following extensions.
