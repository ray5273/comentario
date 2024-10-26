---
title: Deployment
description: How to deploy Comentario Helm chart
weight: 200
tags:
    - installation
    - configuration
    - Kubernetes
    - Let's Encrypt
    - Helm
    - Helm chart
    - Bitnami
    - database
    - PostgreSQL
seeAlso:
  - prerequisites
  - parameters
  - backup
---

All examples below use the same [namespace](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/), referred to as `$NAMESPACE`. If it doesn't exist yet, create it with:

<!--more-->

```bash
export NAMESPACE=my-comentario
kubectl create namespace $NAMESPACE
```

## Optional: deploy PostgreSQL

Comentario may use a PostgreSQL server (another option is local SQLite storage; refer to [](/installation/requirements) for details). In that case PostgreSQL has to be installed separately.

The easiest way to do that in a Kubernetes cluster is by using a Helm chart by [Bitnami](https://bitnami.com/stacks/helm).

**Step 1**: Before installing PostgreSQL, it may be a good idea to manually create a storage volume ({{< abbr "PVC" "Persistent Volume Claim" >}}), because it would give you a full control over its size and lifecycle.

You can create a volume of 1 GiB by using the provided [postgres-pvc.yaml](https://gitlab.com/comentario/comentario/-/blob/master/resources/k8s/postgres-pvc.yaml):

```bash
kubectl create -f resources/k8s/postgres-pvc.yaml --namespace $NAMESPACE
```

**Step 2**: install the PostgreSQL server:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm install \
    --namespace $NAMESPACE \
    --set "image.repository=postgres" \
    --set "image.tag=17-alpine" \
    --set "primary.persistence.existingClaim=comentario-postgres-pvc" \
    --set "global.postgresql.auth.postgresPassword=SECR3t" \
    --set "global.postgresql.auth.database=comentario" \
    --wait \
    comentario-postgres \
    bitnami/postgresql
```

After this, a new release called `comentario-postgres` will be installed, with PostgreSQL version `17-alpine` (adjust values as needed), user `postgres` and password `SECR3t`.

## Deploy Comentario server

1. Edit the values in `resources/k8s/comentario-secrets.yaml` as required (see [](/configuration) for details) and copy-paste its contents into `comentario-secrets.yaml` (indent with 4 spaces)
2. Create the secret: `kubectl create -f resources/k8s/comentario-secrets.yaml --namespace $NAMESPACE`
3. Install Comentario using Helm (consult the [](parameters) page for value description):
```bash
helm upgrade --install \
    --namespace $NAMESPACE \                            # The same namespace value as above
    --set "clusterIssuer=letsencrypt-staging" \         # Replace with letsencrypt-prod when you're ready for production
    --set "image.repository=registry.gitlab.com/comentario/comentario" \
    --set "image.tag=<VERSION>" \                       # Use the desired Comentario version here
    --set "comentario.secretName=comentario-secrets" \  # This is the name of the secret from resources/k8s/comentario-secrets.yaml
    --set "comentario.smtpHost=mail.example.com" \      # Name of the SMTP host you're using for emails
    --set "comentario.smtpFromAddress=x@example.com" \  # Email to set in the Reply field
    --set "ingress.host=comment.example.com" \          # Domain where your Comentario instance should be reachable on 
    my-comentario \                                     # Name of your instance (and Helm release)
    resources/helm/comentario
```

