import { z } from "zod";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function splitLabelAndBody(value: string) {
  const trimmed = value.trim();
  const separators = [" : ", ": ", " - ", " -", " | "];

  for (const separator of separators) {
    const parts = trimmed.split(separator);
    if (parts.length === 2) {
      return {
        label: parts[0]?.trim() || trimmed,
        body: parts[1]?.trim() || trimmed,
      };
    }
  }

  return {
    label: trimmed,
    body: trimmed,
  };
}

function normalizeCoreConcept(value: unknown) {
  if (typeof value === "string") {
    const { label, body } = splitLabelAndBody(value);
    return {
      term: label,
      definition: body,
      features: [],
      keyPoints: [],
      likelyExam: false,
    };
  }

  if (!isRecord(value)) {
    return value;
  }

  if ("term" in value || "definition" in value || "features" in value || "keyPoints" in value) {
    return value;
  }

  const entries = Object.entries(value);

  if (entries.length === 1) {
    const [term, rawValue] = entries[0];

    if (typeof rawValue === "string") {
      return {
        term,
        definition: rawValue,
        features: [],
        keyPoints: [],
        likelyExam: false,
      };
    }

    if (Array.isArray(rawValue)) {
      return {
        term,
        definition: "",
        features: [],
        keyPoints: rawValue,
        likelyExam: false,
      };
    }

    if (isRecord(rawValue)) {
      return {
        term,
        ...rawValue,
      };
    }
  }

  return value;
}

function normalizeStructureNode(value: unknown) {
  if (typeof value === "string") {
    return {
      topic: value,
      children: [],
    };
  }

  if (!isRecord(value)) {
    return value;
  }

  if ("topic" in value || "children" in value) {
    return value;
  }

  const entries = Object.entries(value);

  if (entries.length === 1) {
    const [topic, rawValue] = entries[0];
    return {
      topic,
      children: normalizeStringArray(rawValue),
    };
  }

  return value;
}

function normalizeWork(value: unknown) {
  if (typeof value === "string") {
    const slashParts = value.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);

    if (slashParts.length === 2) {
      return {
        title: slashParts[0],
        artist: slashParts[1],
        commentary: [],
      };
    }

    return {
      title: value,
      artist: "",
      commentary: [],
    };
  }

  if (!isRecord(value)) {
    return value;
  }

  if ("title" in value || "artist" in value || "commentary" in value) {
    return value;
  }

  const entries = Object.entries(value);

  if (entries.length === 1) {
    const [title, rawValue] = entries[0];

    if (typeof rawValue === "string") {
      return {
        title,
        artist: "",
        commentary: [rawValue],
      };
    }

    if (Array.isArray(rawValue)) {
      return {
        title,
        artist: "",
        commentary: rawValue,
      };
    }

    if (isRecord(rawValue)) {
      return {
        title,
        ...rawValue,
      };
    }
  }

  return value;
}

function normalizeQuizItem(value: unknown) {
  if (typeof value === "string") {
    return {
      type: "short_answer",
      question: value,
      answer: "",
      hint: "",
    };
  }

  if (!isRecord(value)) {
    return value;
  }

  if ("question" in value || "answer" in value || "hint" in value || "type" in value) {
    return value;
  }

  const entries = Object.entries(value);

  if (entries.length === 1) {
    const [question, rawValue] = entries[0];

    if (typeof rawValue === "string") {
      return {
        type: "short_answer",
        question,
        answer: rawValue,
        hint: "",
      };
    }

    if (isRecord(rawValue)) {
      return {
        type: "short_answer",
        question,
        ...rawValue,
      };
    }
  }

  return value;
}

const StringField = z.preprocess(normalizeString, z.string());
const StringArrayField = z.preprocess(normalizeStringArray, z.array(z.string()));
const BooleanField = z.preprocess(normalizeBoolean, z.boolean());

export const QuizTypeSchema = z.enum([
  "short_answer",
  "true_false",
  "comparison",
]);

export const QuizItemSchema = z.preprocess(
  normalizeQuizItem,
  z.object({
    type: z.preprocess(normalizeQuizType, QuizTypeSchema),
    question: StringField,
    answer: StringField,
    hint: StringField.default(""),
  }),
);

export const CoreConceptSchema = z.preprocess(
  normalizeCoreConcept,
  z.object({
    term: StringField,
    definition: StringField,
    features: StringArrayField.default([]),
    keyPoints: StringArrayField.default([]),
    likelyExam: BooleanField.default(false),
  }),
);

export const StructureNodeSchema = z.preprocess(
  normalizeStructureNode,
  z.object({
    topic: StringField,
    children: StringArrayField.default([]),
  }),
);

export const WorkSchema = z.preprocess(
  normalizeWork,
  z.object({
    title: StringField,
    artist: StringField.default(""),
    commentary: StringArrayField.default([]),
  }),
);

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
