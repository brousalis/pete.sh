# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

petehome is a smart home ecosystem with multiple client applications:

- **Web App** (`apps/web/`) - Next.js 16 dashboard for controlling Philips Hue lights, Sonos
  speakers, Google Calendar, Chicago Transit (CTA), weather, fitness tracking, coffee automation
- **Desktop App** (`apps/desktop/`) - Electron wrapper that loads the web app
- **iOS App** (`apps/ios/`) - watchOS workout tracking app with HealthKit integration
- **Firefox Extension** (`apps/firefox-extension/`) - New tab page that embeds the web dashboard

## Common Commands

```bash
# Development (from root)
yarn dev                    # Start web dev server (0.0.0.0:3000)
yarn build                  # Build web app for production
yarn desktop                # Start desktop (Electron) app

# PM2 Management (from root)
yarn p:start                # Start main server via PM2
yarn p:start:notifications  # Start Vercel deploy notifications via PM2
yarn p:restart              # Restart main PM2 process
yarn p:logs                 # View PM2 logs
yarn p:status               # View PM2 process status

# Code Quality
yarn lint                   # Run ESLint
yarn lint:fix               # Fix linting issues
yarn format                 # Format with Prettier
yarn type-check             # Run TypeScript type checking

# Cleanup
yarn clean                  # Remove build artifacts and cache
```

## Architecture

### Monorepo Structure

```
petehome/
├── apps/
│   ├── web/                    # Next.js web app (main dashboard)
│   │   ├── app/                # Next.js App Router pages and API routes
│   │   ├── components/         # React components (ui/, dashboard/, etc.)
│   │   ├── lib/                # Services, types, utilities
│   │   ├── hooks/              # Custom React hooks
│   │   ├── data/               # Static data files
│   │   ├── public/             # Static assets
│   │   ├── styles/             # Global styles
│   │   ├── supabase/           # Database migrations
│   │   └── scripts/            # Build and sync scripts
│   ├── electron/               # Desktop app wrapper
│   ├── ios/                    # watchOS app (Swift/SwiftUI)
│   └── firefox-extension/      # Browser extension
├── package.json                # Root workspace config
├── ecosystem.config.js         # PM2 configuration
└── CLAUDE.md                   # This file
```

### Web App Structure (`apps/web/`)

- `app/` - Next.js App Router with pages and 39+ API routes
  - `app/api/` - API routes organized by service (hue, sonos, calendar, cta, weather, fitness, etc.)
  - `app/(dashboard)/` - Dashboard route group with main pages
- `components/` - React components
  - `components/ui/` - shadcn/ui components (buttons, dialogs, cards, etc.)
  - `components/dashboard/` - Dashboard-specific widgets and cards
- `lib/` - Utilities and services
  - `lib/services/` - External service integrations
  - `lib/types/` - TypeScript type definitions
  - `lib/config.ts` - Environment configuration with Zod validation
- `hooks/` - Custom React hooks

### Key Patterns

- React Server Components by default; use `"use client"` only when needed
- Services in `lib/services/` handle external API communication
- API routes in `app/api/` proxy requests to services
- Environment variables validated via Zod in `lib/config.ts`
- Path alias: `@/*` maps to `apps/web/` root

### External Integrations

- **Hue**: Philips Hue bridge for lighting control
- **Sonos**: Speaker control with Spotify integration
- **Calendar**: Google Calendar OAuth integration
- **CTA**: Chicago Transit Authority bus/train data
- **Weather**: Weather API for conditions and forecasts
- **Fitness**: Local workout and routine tracking
- **Coffee**: Coffee machine automation
- **Desktop**: Windows desktop control (display, volume)

## Deployment

- **Vercel**: Set root directory to `apps/web` in project settings
- **PM2**: Run `yarn p:start` from the monorepo root

## Code Style

### TypeScript

- Strict mode enabled
- Prefer explicit types for function parameters and return types
- Use interfaces for object shapes, types for unions/intersections
- Avoid `any` - use `unknown` when type is truly unknown

### React

- Functional components with hooks
- Prefer named exports for components
- Keep components small and focused
- Extract custom hooks for reusable logic

### Naming Conventions

- Components: PascalCase (`LightControls`)
- Functions: camelCase (`handleClick`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Files: kebab-case (`light-controls.tsx`)

### Import Order

1. React/Next.js imports
2. Third-party library imports
3. Internal imports (components, hooks, utils)
4. Type imports (use `import type` when possible)
5. Relative imports last

## Smart Home Specific

- Device states should be reactive and update in real-time
- Use optimistic updates for better UX
- Handle offline scenarios gracefully
- Use WebSockets or Server-Sent Events for real-time updates
