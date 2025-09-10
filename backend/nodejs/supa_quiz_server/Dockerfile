FROM node:20-alpine

WORKDIR /app

# Dépendances
COPY package*.json ./
RUN npm ci --omit=dev

# Code
COPY . .

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# ENTRYPOINT inline :
# - attend Mongo (jusqu'à 30 * 2s)
# - exécute setup.js (idempotent recommandé)
# - puis "exec $@" => lance la CMD (ou la commande de docker-compose si override)
ENTRYPOINT ["/bin/sh","-c","\
URI=${MONGO_URI:-mongodb://mongo:27017/quiz_app}; \
echo '[entrypoint] Waiting for Mongo at:' \"$URI\"; \
i=0; \
until node -e 'const m=require(\"mongoose\"); const u=process.env.MONGO_URI||\"mongodb://mongo:27017/quiz_app\"; m.connect(u,{serverSelectionTimeoutMS:3000}).then(()=>process.exit(0)).catch(()=>process.exit(1));'; do \
  i=$((i+1)); \
  if [ \"$i\" -ge 30 ]; then echo '[entrypoint] giving up after' $i 'tries'; break; fi; \
  echo '[entrypoint] Mongo not ready yet… retry' $i; \
  sleep 2; \
done; \
if [ -f ./setup.js ]; then echo '[entrypoint] running setup.js'; node ./setup.js || echo '[entrypoint] setup.js non-zero (ignored)'; else echo '[entrypoint] no setup.js, skipping'; fi; \
echo '[entrypoint] launching app ->' \"$@\"; \
exec \"$@\" \
","--"]

# CMD par défaut : si docker-compose ne l'écrase pas, on démarre app.js
CMD ["node","app.js"]
