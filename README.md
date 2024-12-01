# CRBC Sanity Studio

Content management system for Calvary Road Baptist Church built with Sanity Studio.

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

4. Start the development server:

```bash
npm run dev
```

## Environment Variables

The following environment variables are required:

| Variable                    | Description                    | Example                   |
| --------------------------- | ------------------------------ | ------------------------- |
| `SANITY_STUDIO_PROJECT_ID`  | Your Sanity project ID         | `"abc123"`                |
| `SANITY_STUDIO_DATASET`     | The dataset to use             | `"production"`            |
| `SANITY_STUDIO_PREVIEW_URL` | URL of your SvelteKit frontend | `"http://localhost:5173"` |

## Project Structure

- `/schemaTypes` - Sanity schema definitions
- `/structure` - Desk structure configuration
- `/plugins` - Custom Sanity plugins

## Features

- Custom desk structure with organized content types
- Live preview functionality
- Media management
- Type-safe schema definitions
