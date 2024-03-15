---
title: Database backup
description: How to back up and restory Comentario database in a Kubernetes cluster
weight: 900
tags:
    - installation
    - configuration
    - Kubernetes
    - database
    - SQLite
    - PostgreSQL
    - backup
---

It's usually a good idea to make periodic backups of Comentario database. Below are procedures that apply when you run Comentario in a Kubernetes cluster.

<!--more-->

## SQLite

### Making a backup

When using a local, file-based SQLite storage, you specify the database file location yourself. In this case you can simply make a copy of that file to another medium.

However, Comentario *should not be running* at the moment of making the copy. This downtime requirement makes the local storage option pretty inconvenient.

### Restoring a backup

The same applies to *restoring the backup*:

* Make sure Comentario is shut down.
* Copy the file from the backup over to the required location.

## PostgreSQL

### Making a backup

To get a full database dump from a PostgreSQL database running in the cluster, issue the following command (assuming your PostgreSQL instance is named `comentario-postgres` and the `NAMESPACE` variable is set to your namespace name):

```bash
kubectl exec -t -n $NAMESPACE \
    $(kubectl get -n $NAMESPACE pods -l app.kubernetes.io/instance=comentario-postgres -o name) \
    -- pg_dump -U postgres -d comentario > /path/to/comentario.sql
```

### Restoring a backup

To restore the database from a previously downloaded dump file (made above), you can use these commands (also assuming your PostgreSQL instance is named `comentario-postgres`).

We cannot send it via the pipe directly (I'm not sure why), so we copy it over first and clean up afterwards.

```bash
PG_POD=$(kubectl get -n $NAMESPACE pods -l app.kubernetes.io/instance=comentario-postgres -o 'jsonpath={.items..metadata.name}')
kubectl cp -n $NAMESPACE /path/to/comentario.sql $PG_POD:/tmp/c.sql
kubectl exec -t -n $NAMESPACE $PG_POD -- psql -U postgres -d comentario -f /tmp/c.sql
kubectl exec -t -n $NAMESPACE $PG_POD -- rm /tmp/c.sql
```
