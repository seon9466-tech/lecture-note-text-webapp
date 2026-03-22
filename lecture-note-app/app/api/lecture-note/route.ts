import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { normalizeTranscript, splitTranscript } from "@/lib/chunk";
import {
  buildChunkDigestPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/prompt";
import { LectureNoteSchema, type LectureNote } from "@/types/note";

export const runtime = "nodejs";

const RequestSchema = z.object({
  courseTitle: z.string().optional().default(""),
  lectureTitle: z.string().optional().default(""),
  density: z.enum(["compressed", "normal", "detailed"]).default("normal"),
  withQuiz: z.boolean().default(false),
  sourceText: z.string().min(50, "강의 텍스트를 조금 더 길게 입력해 주세요."),
});

function formatIssuePath(path: readonly PropertyKey[]) {
  if (path.length === 0) {
    return "root";
  }

  return path
    .map((segment) => {
      if (typeof segment === "number") {
        return `[${segment}]`;
      }

      if (typeof segment === "symbol") {
        return segment.toString();
      }

      return segment;
    })
    .join(".")
    .replace(/\.\[/g, "[");
}

function parseLectureNoteFromText(text: string) {
  const trimmed = text.trim();
  const withoutCodeFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const jsonStart = withoutCodeFence.indexOf("{");
  const jsonEnd = withoutCodeFence.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error("모델 응답에서 JSON 본문을 찾지 못했습니다.");
  }

  const jsonText = withoutCodeFence.slice(jsonStart, jsonEnd + 1);
  const parsedJson = JSON.parse(jsonText);
  const parsed = LectureNoteSchema.safeParse(parsedJson);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue ? formatIssuePath(issue.path) : "root";
    const message = issue?.message || "모델 응답 형식이 올바르지 않습니다.";

    throw new Error(`모델 응답 형식 오류 (${path}): ${message}`);
  }

  return parsed.data;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY가 설정되어 있지 않습니다." },
        { status: 500 },
      );
    }

    const openai = new OpenAI({ apiKey });

    const json = await request.json();
    const requestResult = RequestSchema.safeParse(json);

    if (!requestResult.success) {
      const issue = requestResult.error.issues[0];
      const path = issue ? formatIssuePath(issue.path) : "root";
      const message = issue?.message || "입력값이 올바르지 않습니다.";

      return NextResponse.json(
        { error: `입력값 오류 (${path}): ${message}` },
        { status: 400 },
      );
    }

    const body = requestResult.data;
    const normalized = normalizeTranscript(body.sourceText);
    const chunks = splitTranscript(normalized, 7000);
    const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

    let sourceForFinal = normalized;
    const chunkDigests: string[] = [];

    if (chunks.length > 1) {
      for (let index = 0; index < chunks.length; index += 1) {
        const digestResponse = await openai.responses.create({
          model,
          reasoning: { effort: "low" },
          input: [
            {
              role: "system",
              content:
                "You compress a long lecture transcript into an intermediate digest. Do not add facts that are not in the source text.",
            },
            {
              role: "user",
              content: buildChunkDigestPrompt(chunks[index], index + 1, chunks.length),
            },
          ],
        });

        const digest = digestResponse.output_text?.trim();
        if (digest) {
          chunkDigests.push(digest);
        }
      }

      sourceForFinal = chunkDigests.join("\n\n");
    }

    const finalResponse = await openai.responses.create({
      model,
      reasoning: { effort: "medium" },
      input: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "user",
          content: buildUserPrompt({
            courseTitle: body.courseTitle,
            lectureTitle: body.lectureTitle,
            density: body.density,
            withQuiz: body.withQuiz,
            sourceText: sourceForFinal,
          }),
        },
      ],
    });

    const noteText = finalResponse.output_text?.trim();

    if (!noteText) {
      return NextResponse.json(
        { error: "모델이 노트 본문을 반환하지 않았습니다." },
        { status: 500 },
      );
    }

    let note: LectureNote;

    try {
      note = parseLectureNoteFromText(noteText);
    } catch (parseError) {
      console.error("lecture-note raw model output:", noteText.slice(0, 4000));
      throw parseError;
    }

    return NextResponse.json({
      note: {
        ...note,
        quiz: body.withQuiz ? note.quiz : [],
      },
      meta: {
        usedChunking: chunks.length > 1,
        chunkCount: chunks.length,
        originalChars: normalized.length,
        digestedChars: sourceForFinal.length,
        model,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      const path = issue ? formatIssuePath(issue.path) : "root";

      return NextResponse.json(
        { error: `데이터 형식 오류 (${path}): ${issue?.message || "알 수 없는 형식 오류"}` },
        { status: 500 },
      );
    }

    console.error("lecture-note route failed", error);

    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
