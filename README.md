# Sovereign Cross Stitch

Cross stitch web tool and workspace built under **HandleVault Digital**, designed for fast browser-side use with minimal backend overhead and a lightweight footprint.

## Current Project Structure

- `public/assets/aistudio/` — Public static assets generated or synced from AI Studio
- `scripts/` — Helper and build/workflow scripts
- `src/` — Application source files, components, and logic
- `index.html` — Main HTML entry point
- `package.json` & `bun.lock` — Dependencies and package lockfile
- `tsconfig.json` & `vite.config.ts` — TypeScript and Vite build configuration
- `.env.example` — Sample environment variables template
- `.github/` — Repository workflows and funding configuration

## Local Development

1. Install dependencies:
   ```bash
   bun install
   
