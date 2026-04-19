export type Density = "compressed" | "normal" | "detailed";

export function buildSystemPrompt() {
  return [
    "You turn lecture transcripts into structured study notes.",
    "Return valid JSON only.",
    "Do not add facts that are not supported by the source text.",
    "Preserve the source language whenever possible.",
    "Keep the structure easy to review and faithful to the lecture.",
    "Adjust output richness to the requested density level: normal density focuses on compact concept notes; story density uses the full expanded structure with all narrative sections.",
    "If quiz items are requested, create answerable questions based only on the source text.",
    "If the lecture discusses specific works or artworks, separate them into a dedicated works array.",
    "Each work item should include title, artist, and commentary.",
    "If a specific artwork is clearly identifiable but the lecture omits the artist, supplement the artist from well-known art-historical knowledge when you are confident.",
    "Artist means the creator of the work. Do not use a museum name, collection name, place name, period label, or style label as artist.",
    "If the artist is genuinely unknown or cannot be identified with confidence, set artist to '미상'. Do not leave artist empty.",
    "When the professor clearly emphasizes something, prefix that item with '* ' so it can be highlighted in the UI.",
    "Do not hide emphasized points inside plain commentary. Mark them explicitly with '* ' wherever they appear.",
    "For Korean output, use concise note-style endings. Prefer compressed noun or verb forms (e.g. '변함', '추구함', '대비됨', '적용') over full sentence endings (e.g. '변합니다', '추구하였다', '대비되었다고 설명하였다'). Bullets should read like terse study notes, not prose.",
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
      "Write compact, structured study notes focused on concept clarity. Leave restoredContext, practiceFlow, practicePoints, examAnswerTemplates, presentationLines, and transcriptCorrections as empty arrays — do not fill them. Focus entirely on oneSentenceTheme, coreConcepts (with subConcepts), works, examPoints, and memoryLines. In Korean output, write natural notes and vary sentence endings.",
    detailed:
      "Write it in a story-like lecture flow, as if the professor is speaking continuously. Preserve the original wording, phrasing, order, and transitions almost verbatim — only remove filler words and obvious repetitions. The notes should read like a cleaned-up transcript where the professor's voice and tone remain intact.",
  };

  return [
    params.courseTitle ? `Course title: ${params.courseTitle}` : "Course title: Unspecified",
    params.lectureTitle ? `Lecture title: ${params.lectureTitle}` : "Lecture title: Unspecified",
    `Detail level: ${densityMap[params.density]}`,
    `Include quiz: ${params.withQuiz ? "Yes" : "No"}`,
    "Requirements:",
    params.density === "detailed"
      ? "1. restoredContext: write 6 to 12 substantial paragraph-style items that reconstruct the lecture flow almost verbatim, preserving professor quotes and examples."
      : "1. restoredContext: set to an empty array [].",
    "2. summary must contain 3 to 5 bullet-style items.",
    params.density === "normal"
      ? "3. coreConcepts: term must be a short, neutral topic label (e.g. '그리스 조각의 기본 개념') — NOT a thesis statement or full sentence. Keep definition very short (one sentence) or leave empty. Use subConcepts (array of { term, points }) to organize 2–5 sub-sections per concept group. Each sub-concept term is a concise descriptive title; points must be short, factual bullets — when timestamps appear in the source text (e.g. [00:00]), preserve them at the end of the relevant bullet."
      : "3. coreConcepts must have a descriptive, thesis-like term that conveys the group's point. Each concept group should use subConcepts (array of { term: string, points: string[] }) for 2-4 sub-sections. Each sub-concept term is a concise descriptive title; points are full sentence-style bullets including timestamps from the source if present (e.g. [00:00]). Also include an overall definition for the group.",
    "4. structure must represent a review-friendly topic tree with parent topics and child points.",
    "5. works must be an array. If one or more specific works are discussed, create one entry per work with title, artist, and commentary. Every work item must include artist. Artist must be the creator, not a museum, collection, place, or period label. If you can confidently supplement the artist, do so. If the artist is unknown, use '미상'. If no specific work is discussed, works must be an empty array.",
    params.density === "normal"
      ? "6. practiceFlow: set to an empty array []."
      : "6. practiceFlow must summarize the assignment or class process as short steps in sequence.",
    params.density === "normal"
      ? "7. practicePoints: set to an empty array []."
      : "7. practicePoints must capture practical instructions, cautions, and execution tips.",
    "8. examPoints must focus on likely definitions, comparisons, critiques, or short essay prompts.",
    params.density === "normal"
      ? "9. examAnswerTemplates: set to an empty array []."
      : "9. examAnswerTemplates must contain 2 to 4 longer answer-style paragraphs that can be reused in exams.",
    "10. memoryLines must be short, memorable review lines.",
    params.density === "normal"
      ? "11. presentationLines: set to an empty array []."
      : "11. presentationLines must contain 2 to 4 polished sentences or short paragraphs that can be used directly in a class presentation.",
    params.density === "normal"
      ? "12. transcriptCorrections: set to an empty array []."
      : "12. transcriptCorrections must be an array of objects with source and corrected when obvious speech-to-text mistakes can be inferred from context. If none are clear, return an empty array.",
    "13. oneSentenceTheme must be a focused 1–2 sentence summary of the specific lecture topic — not a general statement about studying or methodology.",
    "14. In Korean output, all bullets (summary, keyPoints, examPoints, memoryLines, subConcept points) must be concise note fragments. Use compressed noun or verb forms — not full formal sentences. Good: '객관적 비례 적용', '무게중심을 한쪽 다리에 둠'. Bad: '객관적 비례가 적용되었습니다', '무게중심을 한쪽 다리에 두었다고 설명하였다'.",
    "15. Do not use honorific or formal prose endings (-합니다, -입니다, -하였다, -되었다고 설명하였다). Use plain compressed forms.",
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
