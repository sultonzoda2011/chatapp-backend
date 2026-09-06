# ChatGram Backend (v2)

Переписан на: NestJS 12, Socket.IO 4.8, Prisma 7.10 + PostgreSQL, JWT-auth.
Поддерживает личные (DIRECT) и групповые (GROUP) чаты через единую модель `Conversation`.

## Запуск

```bash
cp .env.example .env      # заполнить DATABASE_URL, JWT_SECRET и Cloudinary variables
npm install
npx prisma migrate dev --name init
npm run start:dev
```

Prisma 7 хранит URL для CLI/миграций в `prisma.config.ts` (не в `schema.prisma`), а `PrismaClient` в рантайме подключается через driver adapter `@prisma/adapter-pg` — это уже настроено (`src/prisma/prisma.service.ts`, `prisma.config.ts`), нужно только правильно указать `DATABASE_URL` в `.env`.

Swagger: `http://localhost:5000/api-docs`

## REST API

- `POST /api/auth/register` `{username, fullname, email, password}`
- `POST /api/auth/login` `{username, password}`
- `GET /api/auth/profile`
- `PATCH /api/auth/profile`
- `POST /api/auth/profile/avatar` multipart field `image` — загрузить аватар
- `DELETE /api/auth/profile/avatar` — удалить аватар
- `PATCH /api/auth/profile/change-password`
- `GET /api/users/search?q=`
- `GET /api/chat/conversations` — список чатов (личных и групповых) с последним сообщением
- `POST /api/chat/conversations/direct/:userId` — получить/создать личный чат
- `POST /api/chat/conversations/group` `{name, memberIds[]}` или multipart `{name, memberIds, avatar}` — создать группу
- `POST /api/chat/conversations/:id/avatar` multipart field `image` — заменить аватар группы
- `DELETE /api/chat/conversations/:id/avatar` — удалить аватар группы
- `POST /api/chat/conversations/:id/members` `{userId}` — добавить участника в группу
- `GET /api/chat/conversations/:id/messages?cursor=&limit=` — история (пагинация курсором по id)
- `POST /api/chat/conversations/:id/messages` `{content}` — отправить сообщение
- `PATCH /api/chat/messages/:id` `{content}` — редактировать своё сообщение
- `DELETE /api/chat/messages/:id` — удалить (soft-delete) своё сообщение

Все маршруты, кроме `register`/`login`, требуют заголовок `Authorization: Bearer <token>`.

## WebSocket (namespace `/chat`)

Подключение: передать токен в `socket.handshake.auth.token`.

События клиент → сервер:
- `conversation:join` `{conversationId}`
- `message:send` `{conversationId, content}`
- `message:edit` `{messageId, content}`
- `message:delete` `{messageId}`
- `typing` `{conversationId, isTyping}`

События сервер → клиент:
- `message:new`, `message:updated`, `message:deleted`
- `typing`
- `user:online` `{userId}`, `user:offline` `{userId, lastSeenAt}`

Сообщения, отправленные через REST, тоже рассылаются в комнату разговора через тот же Gateway — REST и WS всегда синхронизированы.

## Примечание

## Cloudinary image storage

Добавьте в `.env` значения `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` и `CLOUDINARY_API_SECRET`. После обновления схемы примените `npx prisma migrate deploy` и выполните `npx prisma generate`. Разрешены JPEG, PNG, WEBP и GIF размером до 5 MB. Все upload endpoints требуют JWT и проверяют права владельца/администратора для group avatar.

`npx prisma generate` качает бинарник движка Prisma с `binaries.prisma.sh` — команду нужно выполнить в вашей обычной среде с доступом в интернет (в песочнице, где собирался этот код, этот домен был недоступен, поэтому проверить генерацию клиента живьём не удалось, но остальной код проверен компилятором TypeScript).
