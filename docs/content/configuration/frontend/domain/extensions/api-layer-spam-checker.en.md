---
title: APILayer SpamChecker
description: APILayer SpamChecker extension
tags:
    - configuration
    - frontend
    - Administration UI
    - domain
    - extension
    - spam
    - APILayer
---

The **APILayer SpamChecker** extension uses the [Spam Check API](https://apilayer.com/marketplace/spamchecker-api) service of APILayer for checking comments for spam.

<!--more-->

The extension allows to specify a threshold for marking a comment as spam.

## Configuration

<div class="table-responsive">

| Key         | Description                       | Default value  |
|-------------|-----------------------------------|:--------------:|
| `apiKey`    | APILayer API key                  |                |
| `threshold` | Minimum score to consider as spam |       5        |
{.table .table-striped}
</div>
