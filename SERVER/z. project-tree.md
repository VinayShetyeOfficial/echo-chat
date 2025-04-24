server
├── prisma
│ ├── migrations
│ │ ├── 20250406032854_implement_full_functionality
│ │ │ └── migration.sql
│ │ ├── 20250406042651_add_invitation_model
│ │ │ └── migration.sql
│ │ └── migration_lock.toml
│ └── schema.prisma
├── src
│ ├── controllers
│ │ ├── auth.ts
│ │ ├── users.ts
│ │ ├── channels.ts
│ │ ├── messages.ts
│ │ ├── uploads.ts
│ │ └── invitations.ts
│ ├── routes
│ │ ├── auth.ts
│ │ ├── users.ts
│ │ ├── channels.ts
│ │ ├── messages.ts
│ │ ├── uploads.ts
│ │ └── invitations.ts
│ ├── middleware
│ │ ├── errorHandler.ts
│ │ ├── auth.ts
│ │ └── upload.ts
│ ├── utils
│ │ ├── jwt.ts
│ │ ├── routeHandler.ts
│ │ └── simpleJwt.ts
│ ├── types
│ │ ├── index.ts
│ │ └── socket.ts
│ ├── config
│ │ ├── mongodb.ts
│ │ └── auth.ts
│ ├── models
│ │ ├── User.ts
│ │ ├── Channel.ts
│ │ ├── Message.ts
│ │ └── Invitation.ts
│ └── index.ts
├── uploads
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── z. project-tree.md
