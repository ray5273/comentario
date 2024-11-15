#=======================================================================================================================
# Dockerfile to build Comentario Alpine-based image.
# It assumes the frontend and the backend are built (using `npm run build` and `goreleaser release`, accordingly).
#=======================================================================================================================
FROM alpine:3

ARG TARGETOS
ARG TARGETARCH

# Install CA certificates (for sending mail via SMTP TLS)
RUN apk add --no-cache --update ca-certificates

# Copy the previously built frontend
COPY ./build/frontend /comentario/frontend

# Copy static files
COPY ./db /comentario/db
COPY ./templates /comentario/templates

# Copy the correct platform binary (statically linked)
COPY ./dist/comentario-static_${TARGETOS}_${TARGETARCH}/comentario /comentario/

# Make sure files were built and are available
RUN ls -lAF /comentario/ && \
    test -x /comentario/comentario && \
    test -d /comentario/db && \
    test -s /comentario/db/postgres/0001-comentario-v3.sql && \
    test -s /comentario/db/sqlite3/0001-comentario-v3.sql && \
    test -s /comentario/frontend/comentario.css && \
    test -s /comentario/frontend/comentario.js && \
    test -d /comentario/frontend/en/fonts && \
    test -d /comentario/frontend/en/images && \
    test -s /comentario/frontend/en/index.html && \
    test -d /comentario/templates && \
    test -d /comentario/templates/images

WORKDIR /comentario/
ENTRYPOINT ["/comentario/comentario"]
CMD ["--host=0.0.0.0", "--port=80", "-v"]
