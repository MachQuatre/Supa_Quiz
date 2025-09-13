FROM ghcr.io/cirruslabs/flutter:stable AS builder
WORKDIR /app

# Cache deps (le pubspec est DANS le sous-dossier supa_quizz_app)
COPY supa_quizz_app/pubspec.yaml supa_quizz_app/pubspec.lock ./
RUN flutter pub get

# Copie du code Flutter dans /app puis build web
COPY supa_quizz_app/ .
RUN flutter build web --release

# ---- 2) Nginx pour servir Flutter + proxy /api et /ai ----
FROM nginx:alpine
# Conf Nginx au même niveau que ce Dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Artefacts Flutter
COPY --from=builder /app/build/web /usr/share/nginx/html