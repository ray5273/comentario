---
title: Helm chart
description: Deploying Comentario in a Kubernetes cluster with Helm
tags:
    - installation
    - configuration
    - Kubernetes
    - Let's Encrypt
    - Helm
    - Helm chart
    - Bitnami
    - certmanager
    - database
    - PostgreSQL
---

You can easily deploy Comentario into a Kubernetes cluster using a Helm chart.

<!--more-->

[Kubernetes](https://kubernetes.io/) is a modern, production-grade cloud deployment system developed by Google.

Kubernetes provides numerous tools for reliable, scalable cloud deployments, but its flexibility may well prove overwhelming, especially when it comes to deploying multiple components.

Comentario addresses that complexity by providing a so-called [Helm](https://helm.sh/) chart, which greatly facilitates server deployment in a cloud environment.

The chart is available in [Comentario git repository](/about/source-code) in the `helm/comentario` directory.

## Prerequisites

1. [Helm package manager](https://helm.sh/) 3.x is installed.
2. We're using [certmanager](https://cert-manager.io/) for dealing with SSL certificates in the cluster: requesting and renewing.
3. Once you have `certmanager` up and running, create a new `ClusterIssuer` for Let's Encrypt. Or, even better, two issuers: `letsencrypt-staging` for experimenting with your installation (so that you don't hit Let's Encrypt usage limits) and `letsencrypt-prod` for production usage.

## Namespace

All examples below use the same [namespace](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/), referred to as `$NAMESPACE`. If it doesn't exist yet, create it with:

```bash
kubectl create namespace $NAMESPACE
```

## Deploy PostgreSQL

Comentario requires a PostgreSQL server (refer to [](/installation/requirements) for details), which has to be installed separately.

The easiest way to do that in a Kubernetes cluster is by using a Helm chart by [Bitnami](https://bitnami.com/stacks/helm).

**Step 1**: Before installing PostgreSQL, it may be a good idea to manually create a storage volume ({{< abbr "PVC" "Persistent Volume Claim" >}}), because it would give you a full control over its size and lifecycle.

You can create a volume of 1 GiB by using the provided [postgres-pvc.yaml](https://gitlab.com/comentario/comentario/-/blob/master/k8s/postgres-pvc.yaml):

```bash
kubectl create -f k8s/postgres-pvc.yaml --namespace $NAMESPACE
```

**Step 2**: install the PostgreSQL server:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm install \
    --namespace $NAMESPACE \
    --set "image.repository=postgres" \
    --set "image.tag=15-alpine" \
    --set "primary.persistence.existingClaim=comentario-postgres-pvc" \
    --set "global.postgresql.auth.postgresPassword=SECR3t" \
    --set "global.postgresql.auth.database=comentario" \
    --wait \
    comentario-postgres \
    bitnami/postgresql
```

After this, a new release called `comentario-postgres` will be installed, with PostgreSQL version `15-alpine` (adjust values as needed), user `postgres` and password `SECR3t`.

## Deploy Comentario server

1. Edit the values in `k8s/comentario-secrets.yaml` as required (see [](/configuration) for details) and copy-paste its contents into `comentario-secrets.yaml` (indent with 4 spaces)
2. Create the secret: `kubectl create -f k8s/comentario-secrets.yaml --namespace $NAMESPACE`
3. Install Comentario using Helm (adjust the values as you see fit):
```bash
helm upgrade --install \
    --namespace $NAMESPACE \                            # The same namespace value as above
    --set "clusterIssuer=letsencrypt-staging" \         # Replace with letsencrypt-prod when you're ready for production
    --set "image.repository=registry.gitlab.com/comentario/comentario" \
    --set "image.tag=<VERSION>" \                       # Use the desired Comentario version here
    --set "comentario.secretName=comentario-secrets" \  # This is the name of the secret from k8s/comentario-secrets.yaml
    --set "comentario.smtpHost=mail.example.com" \      # Name of the SMTP host you're using for emails
    --set "comentario.smtpFromAddress=x@example.com" \  # Email to set in the Reply field
    --set "ingress.host=comment.example.com" \          # Domain where your Comentario instance should be reachable on 
    my-comentario \                                     # Name of your instance (and Helm release)
    helm/comentario
```

## Backing up the database

To get a full database dump from the PostgreSQL database running in the cluster, issue the following command (assuming your PostgreSQL instance is named `comentario-postgres`):

```bash
kubectl exec -t -n $NAMESPACE \
    $(kubectl get -n $NAMESPACE pods -l app.kubernetes.io/instance=comentario-postgres -o name) \
    -- pg_dump -U postgres -d comentario > /path/to/comentario.sql
```

## Restoring the database from backup

To restore the database from a previously downloaded dump file (see above), you can use these commands (also assuming your PostgreSQL instance is named `comentario-postgres`).

We cannot send it via the pipe directly (I'm not sure why), so we copy it over first and clean up afterwards.

```bash
PG_POD=$(kubectl get -n $NAMESPACE pods -l app.kubernetes.io/instance=comentario-postgres -o 'jsonpath={.items..metadata.name}')
kubectl cp -n $NAMESPACE /path/to/comentario.sql $PG_POD:/tmp/c.sql
kubectl exec -t -n $NAMESPACE $PG_POD -- psql -U postgres -d comentario -f /tmp/c.sql
kubectl exec -t -n $NAMESPACE $PG_POD -- rm /tmp/c.sql
```
