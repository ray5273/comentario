---
title: Migration from WordPress
description: How to migrate to Comentario from WordPress
weight: 300
tags:
    - WordPress
    - migration
---

Migration to Comentario from WordPress is pretty straightforward.

You just export your data from WordPress, then import the downloaded data dump into Comentario.

<!--more-->

## Migration steps

### 1. Back up your data

{{< callout "warning" "IMPORTANT" >}}
* If you're importing data into an existing Comentario domain, remember to always **make a backup first**.
* Once you've made it, make sure it **can be restored**!
{{< /callout >}}

If you will import into a new domain, you can skip this step because you can simply delete that domain should the process go wrong.

### 2. Perform data export from WordPress

1. In WordPress, navigate to `Tools` ⇒ `Export`.
2. Select `Posts` as the content type.
3. Click `Export`. Once the process finished, you'll be able to download the (compressed) XML export file.

### 3. Import the data into Comentario

1. Log into Comentario as a domain owner or a [superuser](/kb/permissions/superuser).
2. Create a new domain, or select an existing one using the [Domain selector](/configuration/frontend/domain).
3. In the sidebar, click `Operations` and select `Import data`: you'll land on the Import data page.
4. Select `WordPress` as the source format.
5. Select the file you downloaded in the previous step.
6. Click `Import`.
7. Once the import is complete, you'll get an overview with numbers of imported, skipped and failed items.

### 4. Update your code snippet

Replace the code that embedded WordPress on your pages with Comentario web component code (`<comentario-comments>`) provided in the Administration console, under `Domain properties` ⇒ `Installation`.

### 5. Enjoy

If everything worked out fine, you should be able to see the imported comment threads on every relevant page!
