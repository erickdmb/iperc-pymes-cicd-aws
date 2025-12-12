FROM node:18-alpine

WORKDIR /app

# Copiar package antes para aprovechar caché
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY . .

# Usuario no root (buena práctica)
USER node

EXPOSE 3000

CMD ["npm", "start"]