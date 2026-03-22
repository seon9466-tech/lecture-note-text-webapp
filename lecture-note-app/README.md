# Lecture Note App

Long lecture text in, structured study notes out.

This Next.js app takes a lecture transcript or class notes and turns them into:

- concise summaries
- core concept breakdowns
- a topic structure map
- likely exam points
- short memory lines
- optional review quiz items

## Run locally

From the repository root:

```bash
npm install
npm run dev
```

Create `lecture-note-app/.env.local` before starting the server:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.4-mini
```

Then open `http://localhost:3000`.

## Files

- `app/page.tsx`: UI for input and rendered note output
- `app/api/lecture-note/route.ts`: OpenAI-backed note generation endpoint
- `lib/prompt.ts`: prompt builders
- `lib/chunk.ts`: long text chunking helpers
- `types/note.ts`: structured output schema
