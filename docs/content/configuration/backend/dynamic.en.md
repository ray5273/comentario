---
title: Dynamic configuration
description: Comentario runtime configuration
weight: 50
tags:
    - configuration
    - administration
---

The dynamic, or runtime, configuration of Comentario server can be set in the Administrative UI.

<!--more-->

As opposed to the [static config](static), which can only be changed on server start-up, dynamic items can be changed on-the-fly, and they apply immediately.

## Managing dynamic configuration

You have to be a [superuser](/kb/permissions/superuser) to manage dynamic configuration.

In order to view or edit the dynamic configuration, open the Administrative UI and navigate to `Administration` → `Configuration` → `Dynamic`.

Any changes will be saved in the database and apply right away.

## Configuration parameters

The following dynamic parameters are available.

New commenters must confirm their email
: Whether users registering on comment pages are required to confirm their email before they can log in. If set to `Off`, users can log in immediately upon registration (not recommended due to security considerations).

New users must confirm their email
: Whether users registering via Administration UI are required to confirm their email before they can log in. If set to `Off`, users can log in immediately upon registration (not recommended due to security considerations).

Enable registration of new users
: If set to `Off`, no new user can register (applies both to embedded comments and the Administration UI). Can be useful for (temporarily) preventing new sign-ups.

Show deleted comments
: When set to `On`, deleting a comment in the embedded Comentario will only *mark it as deleted*, but it will still be visible. If set to `Off`, deleted comments will be hidden in the comment tree immediately, as well as all its child comments. Doesn't affect comment display in the Administration UI (it has a separate switch for hiding deleted comments).

Use Gravatar for user avatars
: When enabled, Comentario will try to fetch an avatar image from [Gravatar](https://www.gravatar.com) for each newly registered or logging-in user. For federated users (those registering via Google, Facebook etc.), the identity provider avatar will be tried first.

Enable images in comments
: If set to `Off`, commenters won't be able to insert [images](/kb/markdown#images) in comments. Only applies to newly written comments.

Enable links in comments
: If set to `Off`, commenters won't be able to insert [links](/kb/markdown#links) in comments. Plain-text URLs won't be turned into clickable links either. Only applies to newly written comments.

Non-owner users can add domains
: If set to `Off`, users without domains (for example, commenters) won't be able to register their own domains in Comentario, and thus become domain owners. Most likely, this is what you want, therefore `Off` is the default. Doesn't affect users who already own at least one domain.
