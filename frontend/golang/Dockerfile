# --- build stage ---
FROM golang:1.23.3-alpine AS build
WORKDIR /app

# Modules
COPY go.mod go.sum ./
# (cache modules pour accélérer les rebuilds)
RUN --mount=type=cache,target=/go/pkg/mod go mod download

# Sources
COPY . .

# Build binaire
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/admin .

# --- run stage (alpine avec curl pour le healthcheck) ---
FROM alpine:3.20
WORKDIR /srv
RUN apk add --no-cache ca-certificates curl

# Bin + assets
COPY --from=build /out/admin /srv/admin
COPY --from=build /app/views/  /srv/views/
COPY --from=build /app/static/ /srv/static/

EXPOSE 8080
USER 1000:1000

# Healthcheck interne (utilise curl présent dans l'image)
HEALTHCHECK --interval=10s --timeout=5s --retries=10 CMD curl -fsS http://localhost:8080/health || exit 1

ENTRYPOINT ["/srv/admin"]
