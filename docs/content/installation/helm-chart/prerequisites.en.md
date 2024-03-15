---
title: Prerequisites
description: Requirements for running Comentario in a Kubernetes cluster
weight: 100
tags:
    - installation
    - configuration
    - Kubernetes
    - Let's Encrypt
    - Helm
    - Helm chart
    - certmanager
---

First, make sure you understand the [requirements](/installation/requirements) for running Comentario in general.

<!--more-->

Second, you'll need the following.

1. [Helm package manager](https://helm.sh/) 3.x is installed.
2. We're using [certmanager](https://cert-manager.io/) for dealing with SSL certificates in the cluster: requesting and renewing.
3. Once you have `certmanager` up and running, create a new `ClusterIssuer` for Let's Encrypt. Or, even better, two issuers: `letsencrypt-staging` for experimenting with your installation (so that you don't hit Let's Encrypt usage limits) and `letsencrypt-prod` for production usage.

Below is an example of configuration files for creating these two issuers, while using [Traefik ingress controller](https://doc.traefik.io/traefik/providers/kubernetes-ingress/):

```yaml
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    email: <YOUR EMAIL HERE> # Update this
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: issuer-letsencrypt-staging
    solvers:
      - http01:
          ingress:
            class: traefik-cert-manager

---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: <YOUR EMAIL HERE> # Update this
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: issuer-letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: traefik-cert-manager
```
