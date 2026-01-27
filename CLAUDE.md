# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Petehome is a smart home control center built with Next.js 16, React 19, TypeScript 5, and Tailwind CSS 4 with shadcn/ui components. It provides a web dashboard for controlling Philips Hue lights, Sonos speakers, Google Calendar, Chicago Transit (CTA), weather, fitness tracking, coffee machine automation, and more.

## Common Commands

```bash
# Development
yarn dev                    # Start dev server (0.0.0.0:3000)

# Build & Production
yarn build                  # Build for production
yarn pm2:start              # Start via PM2
yarn pm2:restart            # Restart PM2 process
yarn pm2:logs               # View PM2 logs

# Code Quality
yarn lint                   # Run ESLint
yarn lint:fix               # Fix linting issues
yarn format                 # Format with Prettier
yarn type-check             # Run TypeScript type checking

# Cleanup
yarn clean                  # Remove build artifacts and cache
```

## Architecture

### Directory Structure
- `app/` - Next.js App Router with pages and 39 API routes
  - `app/api/` - API routes organized by service (hue, sonos, calendar, cta, weather, fitness, coffee, etc.)
  - `app/(dashboard)/` - Dashboard route group with main pages (dashboard, lights, music, calendar, transit, fitness, coffee)
- `components/` - React components
  - `components/ui/` - shadcn/ui components (buttons, dialogs, cards, etc.)
  - `components/dashboard/` - Dashboard-specific widgets and cards
- `lib/` - Utilities and services
  - `lib/services/` - External service integrations (HueService, SonosService, CalendarService, WeatherService, CTAService, etc.)
  - `lib/types/` - TypeScript type definitions
  - `lib/config.ts` - Environment configuration with Zod validation
- `hooks/` - Custom React hooks
- `data/` - Static data files (fitness routines, workout definitions)

### Key Patterns
- React Server Components by default; use `"use client"` only when needed
- Services in `lib/services/` handle external API communication
- API routes in `app/api/` proxy requests to services
- Environment variables validated via Zod in `lib/config.ts`
- Path alias: `@/*` maps to project root

### External Integrations
- **Hue**: Philips Hue bridge for lighting control
- **Sonos**: Speaker control with Spotify integration
- **Calendar**: Google Calendar OAuth integration
- **CTA**: Chicago Transit Authority bus/train data
- **Weather**: Weather API for conditions and forecasts
- **Fitness**: Local workout and routine tracking
- **Coffee**: Coffee machine automation
- **Desktop**: Windows desktop control (display, volume)

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
