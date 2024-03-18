---
title: Perspective
description: Perspective extension
tags:
    - configuration
    - frontend
    - Administration UI
    - domain
    - extension
    - spam
    - toxicity
    - Perspective
---

The **Perspective** extension uses the [Perspective API](https://perspectiveapi.com/) service for checking comments for spam or toxic content.

<!--more-->

The extension supports all available [production attributes](https://developers.perspectiveapi.com/s/about-the-api-attributes-and-languages).

## Configuration

* Parameters names use camelCased attribute names.
* If a specific attribute is not mentioned in the configuration, it won't be requested from the service.
* A comment will be flagged if *any* of the thresholds was exceeded.

Consult Perspective docs to learn more about attributes and supported languages.

<div class="table-responsive">

| Key              | Description                                                                                                             | Default value |
|------------------|-------------------------------------------------------------------------------------------------------------------------|:-------------:|
| `apiKey`         | Perspective API key                                                                                                     |               |
| `toxicity`       | Threshold for flagging a rude, disrespectful, or unreasonable comment.                                                  |      0.5      |
| `severeToxicity` | Threshold for flagging a very hateful, aggressive, disrespectful comment.                                               |      0.5      |
| `identityAttack` | Threshold for flagging a negative or hateful comment targeting someone because of their identity.                       |      0.5      |
| `insult`         | Threshold for flagging an insulting, inflammatory, or negative comment towards a person or a group of people.           |      0.5      |
| `profanity`      | Threshold for flagging a comment containing swear words, curse words, or other obscene or profane language.             |      0.5      |
| `threat`         | Threshold for flagging a comment with an intention to inflict pain, injury, or violence against an individual or group. |      0.5      |
{.table .table-striped}
</div>
