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
    "Artist means the creator of the work. Do not use a museum name, collection name, place name, period label, or style label as artist.",
    "If the artist is genuinely unknown or cannot be identified with confidence, set artist to '미상'. Do not leave artist empty.",
    "When the professor clearly emphasizes something, prefix that item with '* ' so it can be highlighted in the UI.",
    "Do not hide emphasized points inside plain commentary. Mark them explicitly with '* ' wherever they appear.",
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
      "Write it in a story-like lecture flow, as if the professor is speaking directly. Preserve the original wording, order, and transitions as much as possible while still keeping it readable as study notes.",
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
    "4. works must be an array. If one or more specific works are discussed, create one entry per work with title, artist, and commentary. Every work item must include artist. Artist must be the creator, not a museum, collection, place, or period label. If you can confidently supplement the artist, do so. If the artist is unknown, use '미상'. If no specific work is discussed, works must be an empty array.",
    "5. examPoints must focus on likely definitions, comparisons, critiques, or short essay prompts.",
    "6. memoryLines must be short, memorable review lines.",
    "7. In Korean output, summary items, keyPoints, examPoints, memoryLines, and work commentary should read like natural sentence-style notes. Avoid noun-only fragments.",
    "8. Vary Korean sentence endings naturally. Do not make every line end with the same suffix.",
    "9. When the professor emphasized something, prefix that item with '* '. Mark every emphasized point explicitly.",
    params.withQuiz
      ? "10. quiz must contain 3 to 5 items and each type must be one of: short_answer, true_false, comparison."
      : "10. quiz must be an empty array.",
    params.density === "detailed"
      ? "11. In story mode, write in a flowing lecture voice. Keep close to the original source wording, sequence, and examples. Let the notes read like the professor is guiding the class through the topic."
      : "11. Match the requested density while staying faithful to the source text.",
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
