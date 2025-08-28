FROM node:20-bullseye
WORKDIR /app

COPY package*.json ./

# Si lockfile présent -> ci, sinon install
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY . .

# Sécurité : si "bcrypt" traînait encore, on le désinstalle (sans effet s'il est absent)
RUN npm uninstall bcrypt || true

EXPOSE 3001
ENV PORT=3001
CMD ["npm", "start"]
