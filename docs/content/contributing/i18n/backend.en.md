---
title: Backend
description: How to translate backend and embed parts
weight: 100
tags:
    - contributing
    - i18n
    - internationalisation
    - backend
    - embedding
seeAlso:
  - /configuration/embedding/comments-tag/lang
---

The *backend* (the server part) and the *embedded comment engine* share the same set of so-called *messages*, all of them located under `resources/i18n/` in the project root.

<!--more-->

You can see the list of available languages by logging into the Administration UI as a [superuser](/kb/permissions/superuser) and navigating to `Configuration` ⇒ `Static`: the section `Available UI languages` lists all installed translations.

Each translation is a text-based YAML file, providing a mapping between **Message ID** and **Message translation**. The file name must be a [RFC 5646 tag](https://datatracker.ietf.org/doc/html/rfc5646) of the target language, and its extension `yaml`. For example:

* `ru.yaml` for Russian
* `en.yaml` for English
* `en-gb.yaml` for British English
* `pt.yaml` for Portuguese (Portugal)
* `pt-br.yaml` for Brazilian Portuguese

Here's an example for English:

```yaml
# en.yaml
- {id: accountCreatedConfirmEmail, translation: Account is successfully created. Please check your email and click the confirmation link it contains.}
- {id: actionAddComment,           translation: Add Comment}
- {id: actionApprove,              translation: Approve}
- {id: actionCancel,               translation: Cancel}
```

And below is an example how the same messages look in Russian:

```yaml
# ru.yaml
- {id: accountCreatedConfirmEmail, translation: Аккаунт успешно зарегистрирован. Мы отправили вам емэйл, пожалуйста, подтвердите свой адрес, перейдя по содержащейся в нём ссылке.}
- {id: actionAddComment,           translation: Добавить комментарий}
- {id: actionApprove,              translation: Утвердить}
- {id: actionCancel,               translation: Отмена}
```

## Process

If you'd like to contribute your own translation for a language that is missing, follow these steps:

1. [Fork](https://gitlab.com/comentario/comentario/-/forks/new) the Comentario repository.
2. Make a copy of an existing translation (`resources/i18n/en.yaml` is always the most complete one) into a new `resources/i18n/<language_tag>.yaml`.
3. Translate every message.
4. Modify the file `cypress/support/cy-utils.ts` by adding your new language spec to the constant `UI_LANGUAGES`: it's used in end-2-end tests to verify every available language.
5. Commit both files into your fork.
6. Make sure the build pipeline has finished successfully.
7. Submit a [Merge Request](https://docs.gitlab.com/ee/user/project/merge_requests/) for merging your changes into the `dev` branch.

