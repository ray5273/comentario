---
title: Migration from Disqus
description: How to migrate to Comentario from Disqus
weight: 300
tags:
    - Disqus
    - migration
---

Migration to Comentario from Disqus is pretty straightforward.

You just export your data from Disqus, then import the downloaded data dump into Comentario.

<!--more-->

## Migration steps

### 1. Back up your data

{{< callout "warning" "IMPORTANT" >}}
* If you're importing data into an existing Comentario domain, remember to always **make a backup first**.
* Once you've made it, make sure it **can be restored**!
{{< /callout >}}

If you will import into a new domain, you can skip this step because you can simply delete that domain should the process go wrong.

### 2. Request a data export from Disqus

Go to the [admin export section](https://disqus.com/admin/discussions/export/) in Disqus and click **Export Comments**. This should start the process of exporting your comments in the background.

As soon as that process is complete, you'll receive an email from Disqus with a link to a compressed archive of all comments and associated data.

### 3. Download the data dump

Download the data dump archive using the link from the previous step.

### 4. Import the data into Comentario

1. Log into Comentario as a domain owner or a [superuser](/kb/permissions/superuser).
2. Create a new domain, or select an existing one using the [Domain selector](/configuration/frontend/domain).
3. In the sidebar, click `Operations` and select `Import data`: you'll land on the Import data page.
4. Select `Disqus` as the source format.
5. Select the file you downloaded in the previous step.
6. Click `Import`.
7. Once the import is complete, you'll get an overview with numbers of imported, skipped and failed items.

### 5. Update your code snippet

Replace the code that embedded Disqus on your pages with Comentario web component code (`<comentario-comments>`) provided in the Administration console, under `Domain properties` ⇒ `Installation`.

### 6. Enjoy

If everything worked out fine, you should be able to see the imported comment threads on every relevant page!
