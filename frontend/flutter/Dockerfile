FROM ghcr.io/cirruslabs/flutter:stable AS builder
WORKDIR /app

# Cache deps
COPY supa_quizz_app/pubspec.yaml supa_quizz_app/pubspec.lock ./ 
RUN flutter pub get

# Code + build
COPY supa_quizz_app/ .
RUN flutter build web --release

# ---- 2) Nginx pour servir Flutter + proxy /api et /ai ----
FROM nginx:alpine

# Conf Nginx (celle ci-dessus) + proxy_params
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY proxy_params /etc/nginx/proxy_params

# Artefacts Flutter
COPY --from=builder /app/build/web /usr/share/nginx/html

# (Optionnel) Healthcheck simple
HEALTHCHECK CMD wget -q -O - http://127.0.0.1/ >/dev/null 2>&1 || exit 1
