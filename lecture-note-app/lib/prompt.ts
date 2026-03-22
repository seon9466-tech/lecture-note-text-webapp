export type Density = "compressed" | "normal" | "detailed";

export function buildSystemPrompt() {
  return [
    "You turn lecture transcripts into structured study notes.",
    "Return valid JSON only.",
    "Do not add facts that are not supported by the source text.",
    "Preserve the source language whenever possible.",
    "Keep the structure easy to review and faithful to the lecture.",
    "If quiz items are requested, create answerable questions based only on the source text.",
    "If the lecture discusses specific works or artworks, separate them into a dedicated works array.",
    "Each work item should include title, artist, and commentary.",
    "If a specific artwork is clearly identifiable but the lecture omits the artist, supplement the artist from well-known art-historical knowledge when you are confident.",
    "If the artist is genuinely unknown or cannot be identified with confidence, set artist to '미상'. Do not leave artist empty.",
    "When the professor clearly emphasizes something, prefix that item with '* ' so it can be highlighted in the UI.",
    "For Korean output, use natural sentence endings with variation. Do not end every item with the same pattern.",
  ].join(" ");
}

export function buildUserPrompt(params: {
  lectureTitle?: string;
  courseTitle?: string;
  density: Density;
  withQuiz: boolean;
  sourceText: string;
}) {
  const densityMap: Record<Density, string> = {
    compressed: "Make it highly compressed for quick review before an exam.",
    normal:
      "Balance brevity and context. In Korean output, write natural full sentence notes rather than noun fragments. Vary the endings naturally.",
    detailed:
      "Include more explanation, comparison, and nuance while still keeping the notes clear and review-friendly.",
  };

  return [
    params.courseTitle ? `Course title: ${params.courseTitle}` : "Course title: Unspecified",
    params.lectureTitle ? `Lecture title: ${params.lectureTitle}` : "Lecture title: Unspecified",
    `Detail level: ${densityMap[params.density]}`,
    `Include quiz: ${params.withQuiz ? "Yes" : "No"}`,
    "Requirements:",
    "1. summary must contain 3 to 5 bullet-style items.",
    "2. coreConcepts must clearly describe definition, features, keyPoints, and likelyExam.",
    "3. structure must represent a review-friendly topic tree with parent topics and child points.",
    "4. works must be an array. If one or more specific works are discussed, create one entry per work with title, artist, and commentary. Every work item must include artist. If you can confidently supplement the artist, do so. If the artist is unknown, use '미상'. If no specific work is discussed, works must be an empty array.",
    "5. examPoints must focus on likely definitions, comparisons, critiques, or short essay prompts.",
    "6. memoryLines must be short, memorable review lines.",
    "7. In Korean output, summary items, keyPoints, examPoints, memoryLines, and work commentary should read like natural sentence-style notes. Avoid noun-only fragments.",
    "8. Vary Korean sentence endings naturally. Do not make every line end with the same suffix.",
    "9. When the professor emphasized something, prefix that item with '* '.",
    params.withQuiz
      ? "10. quiz must contain 3 to 5 items and each type must be one of: short_answer, true_false, comparison."
      : "10. quiz must be an empty array.",
    "Source text:",
    params.sourceText,
  ].join("\n\n");
}

export function buildChunkDigestPrompt(chunk: string, index: number, total: number) {
  return [
    `This is chunk ${index} of ${total} from a long lecture transcript.`,
    "Summarize it as compact study notes.",
    "Focus on:",
    "- central claims",
    "- important concepts, people, works, or examples",
    "- comparisons or critiques",
    "- likely exam points",
    "- points the professor strongly emphasized",
    "Use no more than 12 bullet items.",
    "Prefix professor-emphasized points with '* '.",
    "Source text:",
    chunk,
  ].join("\n\n");
}
