import { z } from "zod";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeArrayLike(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>);
  }

  return [];
}

function normalizeStringArray(value: unknown) {
  const arrayLike = normalizeArrayLike(value);

  if (arrayLike.length > 0) {
    return arrayLike
      .map((item) => normalizeString(item))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\n+/)
      .map((item) => item.replace(/^[-0-9.)\s]+/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    return /^(true|yes|y|1)$/i.test(value.trim());
  }

  return false;
}

function normalizeQuizType(value: unknown) {
  if (typeof value !== "string") return "short_answer";

  const normalized = value.trim().toLowerCase();

  if (normalized.includes("true") || normalized.includes("false") || normalized.includes("ox")) {
    return "true_false";
  }

  if (normalized.includes("compare") || normalized.includes("comparison")) {
    return "comparison";
  }

  return "short_answer";
}

const StringField = z.preprocess(normalizeString, z.string());
const StringArrayField = z.preprocess(normalizeStringArray, z.array(z.string()));
const BooleanField = z.preprocess(normalizeBoolean, z.boolean());

export const QuizTypeSchema = z.enum([
  "short_answer",
  "true_false",
  "comparison",
]);

export const QuizItemSchema = z.object({
  type: z.preprocess(normalizeQuizType, QuizTypeSchema),
  question: StringField,
  answer: StringField,
  hint: StringField.default(""),
});

export const CoreConceptSchema = z.object({
  term: StringField,
  definition: StringField,
  features: StringArrayField.default([]),
  keyPoints: StringArrayField.default([]),
  likelyExam: BooleanField.default(false),
});

export const StructureNodeSchema = z.object({
  topic: StringField,
  children: StringArrayField.default([]),
});

export const WorkSchema = z.object({
  title: StringField,
  artist: StringField.default(""),
  commentary: StringArrayField.default([]),
});

export const LectureNoteSchema = z.object({
  title: StringField,
  oneSentenceTheme: StringField,
  summary: StringArrayField.default([]),
  coreConcepts: z.preprocess(normalizeArrayLike, z.array(CoreConceptSchema)).default([]),
  structure: z.preprocess(normalizeArrayLike, z.array(StructureNodeSchema)).default([]),
  works: z.preprocess(normalizeArrayLike, z.array(WorkSchema)).default([]),
  examPoints: StringArrayField.default([]),
  memoryLines: StringArrayField.default([]),
  quiz: z.preprocess(normalizeArrayLike, z.array(QuizItemSchema)).default([]),
});

export type LectureNote = z.infer<typeof LectureNoteSchema>;
export type QuizType = z.infer<typeof QuizTypeSchema>;
export type QuizItem = z.infer<typeof QuizItemSchema>;
export type Work = z.infer<typeof WorkSchema>;
