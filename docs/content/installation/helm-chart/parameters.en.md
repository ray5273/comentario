---
title: Parameters
description: Comentario Helm chart parameter description
weight: 300
tags:
    - installation
    - configuration
    - Kubernetes
    - Helm
    - Helm chart
seeAlso:
    - prerequisites
    - /installation/helm-chart
    - /configuration/backend/secrets
---

Comentario [Helm chart](..) provides the following configuration parameters.

<!--more-->

<div class="table-responsive">

| Name                               | Description                                                                                                              | Value                                              |
|------------------------------------|--------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------|
| `replicaCount`                     | Number of desired pods. **NB:** Comentario doesn't support upscaling to more than 1 pod at the moment                    | `1`                                                |
| `image.repository`                 | Docker image registry to download Comentario image from                                                                  | `registry.gitlab.com/comentario/comentario`        |
| `image.pullPolicy`                 | Image pull policy                                                                                                        | `Always`                                           |
| `image.tag`                        | Image tag to use: a specific release tag, `latest` for latest released version, or `edge` for latest development build   | `latest`                                           |
| `imagePullSecrets`                 | Docker image registry secret names as an array                                                                           | `[]`                                               |
| `nameOverride`                     | Override for the instance name                                                                                           |                                                    |
| `fullnameOverride`                 | Override for full name, which is used to create all Kubernetes objects                                                   |                                                    |
| `serviceAccount.create`            | Whether a service account should be created                                                                              | `true`                                             |
| `serviceAccount.annotations`       | Annotations to add to the service account as an object                                                                   | `{}`                                               |
| `serviceAccount.name`              | Name of the service account to use. If not set and `create` is `true`, a name is generated using the fullname template   |                                                    |
| `podAnnotations`                   | Additional pod annotation as an object                                                                                   | `{}`                                               |
| `podSecurityContext`               | Pod security context configuration                                                                                       | `{}`                                               |
| `securityContext`                  | Security context configuration                                                                                           | `{}`                                               |
| `service.type`                     | Type of the service object                                                                                               | `ClusterIP`                                        |
| `service.port`                     | Service port                                                                                                             | `80`                                               |
| `ingress.enabled`                  | Whether to create ingress objects                                                                                        | `true`                                             |
| `ingress.host`                     | Host to install an ingress rule for                                                                                      | `comentario.example.com`                           |
| `clusterIssuer`                    | Name of [ClusterIssuer](/installation/helm-chart/prerequisites) to use                                                   | `letsencrypt-staging`                              |
| `comentario.args`                  | Command-line arguments to the `comentario` command                                                                       | `["--host=0.0.0.0", "--port=80", "-v"]`            |
| `comentario.baseDocsUrl`           | Base documentation URL                                                                                                   | `https://docs.comentario.app/`                     |
| `comentario.tosUrl`                | URL of the Terms of Service page                                                                                         | `<comentario.baseDocsUrl>/en/legal/tos/`           |
| `comentario.privacyPolicyUrl`      | URL of the Privacy Policy page                                                                                           | `<comentario.baseDocsUrl>/en/legal/privacy/`       |
| `comentario.homeContentURL`        | URL of a HTML page to display on homepage                                                                                | `https://docs.comentario.app/en/embed/front-page/` |
| `comentario.emailFrom`             | 'From' address in sent emails                                                                                            | `noreply@example.com`                              |
| `comentario.secretName`            | Name of the `Secret` object containing Comentario [secrets](/configuration/backend/secrets)                              | `comentario-secrets`                               |
| `comentario.superuser`             | UUID or email of a user to become a [superuser](/kb/permissions/superuser)                                               |                                                    |
| `comentario.logFullIPs`            | Whether to log IP addresses in full                                                                                      | `false`                                            |
| `comentario.liveUpdate.enabled`    | Whether [Live update](/kb/live-update) is enabled                                                                        | `true`                                             |
| `comentario.liveUpdate.maxClients` | Maximum number of Live update WebSocket clients                                                                          | `10000`                                            |
| `resources.limits`                 | Pod resources limit configuration                                                                                        | `{cpu: 500m, memory: 200Mi}`                       |
| `resources.requests`               | Pod resources request configuration                                                                                      |                                                    |
| `autoscaling.enabled`              | Whether horizontal autoscaling is enabled. **NB:** Comentario doesn't support upscaling to more than 1 pod at the moment | `false`                                            |
| `nodeSelector`                     | Node selector configuration                                                                                              | `{}`                                               |
| `tolerations`                      | Pod tolerations configuration as an array                                                                                | `[]`                                               |
| `affinity`                         | Pod scheduling constraints configuration                                                                                 | `{}`                                               |
{.table .table-striped}
</div>
