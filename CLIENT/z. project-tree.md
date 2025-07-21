client
├── prisma
│ ├── migrations
│ │ ├── 20250406032854_implement_full_functionality
│ │ │ └── migration.sql
│ │ ├── 20250406042651_add_invitation_model
│ │ │ └── migration.sql
│ │ └── migration_lock.toml
│ └── schema.prisma
├── public
│ ├── favicon.ico
│ ├── placeholder.svg
│ └── robots.txt
├── src
│ ├── components
│ │ ├── ui
│ │ │ ├── accordion.tsx
│ │ │ ├── alert-dialog.tsx
│ │ │ ├── alert.tsx
│ │ │ ├── aspect-ratio.tsx
│ │ │ ├── avatar.tsx
│ │ │ ├── badge.tsx
│ │ │ ├── breadcrumb.tsx
│ │ │ ├── button.tsx
│ │ │ ├── calendar.tsx
│ │ │ ├── card.tsx
│ │ │ ├── carousel.tsx
│ │ │ ├── chart.tsx
│ │ │ ├── checkbox.tsx
│ │ │ ├── collapsible.tsx
│ │ │ ├── command.tsx
│ │ │ ├── context-menu.tsx
│ │ │ ├── dialog.tsx
│ │ │ ├── drawer.tsx
│ │ │ ├── dropdown-menu.tsx
│ │ │ ├── form.tsx
│ │ │ ├── hover-card.tsx
│ │ │ ├── input-otp.tsx
│ │ │ ├── input.tsx
│ │ │ ├── label.tsx
│ │ │ ├── menubar.tsx
│ │ │ ├── navigation-menu.tsx
│ │ │ ├── pagination.tsx
│ │ │ ├── popover.tsx
│ │ │ ├── progress.tsx
│ │ │ ├── radio-group.tsx
│ │ │ ├── resizable.tsx
│ │ │ ├── scroll-area.tsx
│ │ │ ├── select.tsx
│ │ │ ├── separator.tsx
│ │ │ ├── sheet.tsx
│ │ │ ├── sidebar.tsx
│ │ │ ├── skeleton.tsx
│ │ │ ├── slider.tsx
│ │ │ ├── sonner.tsx
│ │ │ ├── switch.tsx
│ │ │ ├── table.tsx
│ │ │ ├── tabs.tsx
│ │ │ ├── textarea.tsx
│ │ │ ├── toast.tsx
│ │ │ ├── toaster.tsx
│ │ │ ├── toggle-group.tsx
│ │ │ ├── toggle.tsx
│ │ │ ├── tooltip.tsx
│ │ │ └── use-toast.ts
│ │ ├── shared
│ │ │ └── ChatMessage.tsx
│ │ ├── ChannelItem.tsx
│ │ ├── ChatArea.tsx
│ │ ├── ChatHeader.tsx
│ │ ├── ChatMessage.tsx
│ │ ├── ChatSidebar.tsx
│ │ ├── CreateChannelDialog.tsx
│ │ ├── MessageInput.tsx
│ │ ├── SettingsDialog.tsx
│ │ ├── UserAvatar.tsx
│ │ ├── EmojiPicker.tsx
│ │ ├── MessageAttachment.tsx
│ │ ├── InviteButton.tsx
│ │ ├── DebugPanel.tsx
│ │ ├── SupabaseDebugger.tsx
│ │ ├── Lightbox.tsx
│ │ ├── AttachmentGallery.tsx
│ │ └── AudioPlayer.tsx
│ ├── contexts
│ │ ├── AuthContext.tsx
│ │ ├── ChatContext.tsx
│ │ └── SettingsContext.tsx
│ ├── hooks
│ │ ├── use-mobile.tsx
│ │ └── use-toast.ts
│ ├── lib
│ │ ├── utils.ts
│ │ ├── api.ts
│ │ ├── uploadFile.ts
│ │ └── auth.ts
│ ├── pages
│ │ ├── api
│ │ │ └── auth
│ │ │ ├── signup.ts
│ │ │ └── [...nextauth].ts
│ │ ├── Auth.tsx
│ │ ├── Chat.tsx
│ │ ├── Index.tsx
│ │ ├── NotFound.tsx
│ │ ├── \_app.tsx
│ │ └── InvitePage.tsx
│ ├── types
│ │ ├── index.ts
│ │ └── socket.ts
│ ├── data
│ │ └── mockData.ts
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
│ ├── config
│ │ ├── mongodb.ts
│ │ └── auth.ts
│ ├── models
│ │ ├── User.ts
│ │ ├── Channel.ts
│ │ ├── Message.ts
│ │ └── Invitation.ts
│ ├── App.css
│ ├── App.tsx
│ ├── index.css
│ ├── main.tsx
│ ├── vite-env.d.ts
│ └── index.ts
├── uploads
├── .env
├── .gitignore
├── bun.lockb
├── components.json
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── README.md
├── simple-server.js
├── tailwind.config.ts
├── test-auth.js
├── test-client.html
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── z. project-tree.md
