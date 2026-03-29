export type Density = "compressed" | "normal" | "detailed";

export function buildSystemPrompt() {
  return [
    "You turn lecture transcripts into structured study notes.",
    "Return valid JSON only.",
    "Do not add facts that are not supported by the source text.",
    "Preserve the source language whenever possible.",
    "Keep the structure easy to review and faithful to the lecture.",
    "Prefer a rich lecture-note structure that includes restoredContext, coreConcepts, works, practiceFlow, practicePoints, examAnswerTemplates, presentationLines, transcriptCorrections, and oneSentenceTheme.",
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
      "Write thorough, well-organized notes that balance completeness with readability. In Korean output, write natural full sentence notes rather than noun fragments. Vary the endings naturally. Core concepts should use descriptive, thesis-like titles that convey the concept's point (e.g. '사진은 기록보다 새롭게 보기다'). restoredContext should be substantial narrative paragraphs that reconstruct the lecture flow, preserving key quotes and examples from the professor.",
    detailed:
      "Write it in a story-like lecture flow, as if the professor is speaking continuously. Preserve the original wording, phrasing, order, and transitions almost verbatim — only remove filler words and obvious repetitions. The notes should read like a cleaned-up transcript where the professor's voice and tone remain intact.",
  };

  return [
    params.courseTitle ? `Course title: ${params.courseTitle}` : "Course title: Unspecified",
    params.lectureTitle ? `Lecture title: ${params.lectureTitle}` : "Lecture title: Unspecified",
    `Detail level: ${densityMap[params.density]}`,
    `Include quiz: ${params.withQuiz ? "Yes" : "No"}`,
    "Requirements:",
    "1. restoredContext must reconstruct the lecture flow in 4 to 8 paragraph-style items. Each item should be a substantial paragraph covering a distinct part of the lecture, naturally incorporating professor quotes and examples where present.",
    "2. summary must contain 3 to 5 bullet-style items.",
    "3. coreConcepts must have a descriptive, thesis-like term that conveys the concept's point (not just a bare noun), and clearly describe definition, features, keyPoints, and likelyExam.",
    "4. structure must represent a review-friendly topic tree with parent topics and child points.",
    "5. works must be an array. If one or more specific works are discussed, create one entry per work with title, artist, and commentary. Every work item must include artist. Artist must be the creator, not a museum, collection, place, or period label. If you can confidently supplement the artist, do so. If the artist is unknown, use '미상'. If no specific work is discussed, works must be an empty array.",
    "6. practiceFlow must summarize the assignment or class process as short steps in sequence.",
    "7. practicePoints must capture practical instructions, cautions, and execution tips.",
    "8. examPoints must focus on likely definitions, comparisons, critiques, or short essay prompts.",
    "9. examAnswerTemplates must contain 2 to 4 longer answer-style paragraphs that can be reused in exams.",
    "10. memoryLines must be short, memorable review lines.",
    "11. presentationLines must contain 2 to 4 polished sentences or short paragraphs that can be used directly in a class presentation.",
    "12. transcriptCorrections must be an array of objects with source and corrected when obvious speech-to-text mistakes can be inferred from context. If none are clear, return an empty array.",
    "13. oneSentenceTheme must work like a final one-line compression of the lecture's core message.",
    "14. In Korean output, restoredContext, summary items, keyPoints, examPoints, examAnswerTemplates, memoryLines, presentationLines, and work commentary should read like natural sentence-style notes. Avoid noun-only fragments.",
    "15. Vary Korean sentence endings naturally. Do not make every line end with the same suffix.",
    "16. When the professor emphasized something, prefix that item with '* '. Mark every emphasized point explicitly.",
    params.withQuiz
      ? "17. quiz must contain 3 to 5 items and each type must be one of: short_answer, true_false, comparison."
      : "17. quiz must be an empty array.",
    params.density === "detailed"
      ? "18. In story mode, restoredContext should be 6 to 12 items and preserve the original text almost verbatim. Keep the professor's exact phrasing, examples, and speaking rhythm. Only clean up filler words and speech-to-text noise — do not rephrase or summarize. The result should read like the professor is talking directly to the student."
      : "18. Match the requested density while staying faithful to the source text.",
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
