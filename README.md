# Lecture Note Text Webapp Starter

Next.js starter for turning long lecture text into structured study notes with the OpenAI Responses API.

## Quick start

1. Install dependencies from the repository root:

```bash
npm install
```

2. Create `lecture-note-app/.env.local` and add your key:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.4-mini
```

3. Start the dev server from the repository root:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

## Project layout

- `lecture-note-app/app/page.tsx`: main UI
- `lecture-note-app/app/api/lecture-note/route.ts`: note generation API
- `lecture-note-app/lib/prompt.ts`: prompt builders
- `lecture-note-app/lib/chunk.ts`: long text chunking helpers
- `lecture-note-app/types/note.ts`: response schema

## Security note

If a real API key was ever committed to this repository, rotate it immediately in the OpenAI dashboard before using the project again.
