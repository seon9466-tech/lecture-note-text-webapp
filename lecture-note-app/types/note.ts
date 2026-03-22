import { z } from "zod";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanArtistCandidate(value: string) {
  return value
    .trim()
    .replace(/^(작가|artist)\s*[:：]?\s*/i, "")
    .replace(/\s*(의 작품|가 제작한|가 만든|의 조각).*$/u, "")
    .trim();
}

function isLikelyNonArtistLabel(value: string) {
  return /(박물관|미술관|museum|gallery|collection|소장|소장처|양식|시대|지역|왕조|공화정|제국|에트루리아|카피톨리노)/i.test(
    value,
  );
}

function normalizeArtist(value: unknown) {
  const normalized = cleanArtistCandidate(normalizeString(value));

  if (!normalized) {
    return "미상";
  }

  if (/^(미상|unknown|anonymous)$/i.test(normalized)) {
    return "미상";
  }

  if (normalized.length > 40 || /[.!?]/.test(normalized) || isLikelyNonArtistLabel(normalized)) {
    return "미상";
  }

  return normalized;
}

function extractArtistFromCommentary(commentary: string[]) {
  const patterns = [
    /([가-힣A-Za-z][가-힣A-Za-z\s.·-]{1,38})의 작품/u,
    /([가-힣A-Za-z][가-힣A-Za-z\s.·-]{1,38})가 제작한/u,
    /([가-힣A-Za-z][가-힣A-Za-z\s.·-]{1,38})가 만든/u,
    /작가[는은]?\s*([가-힣A-Za-z][가-힣A-Za-z\s.·-]{1,38})/u,
    /by\s+([A-Za-z][A-Za-z\s.-]{1,38})/i,
  ];

  for (const line of commentary) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      const candidate = normalizeArtist(match?.[1]);

      if (candidate !== "미상") {
        return candidate;
      }
    }
  }

  return "미상";
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

function looksLikeQuizType(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return [
    "short_answer",
    "short answer",
    "true_false",
    "true false",
    "ox",
    "comparison",
    "compare",
  ].includes(normalized);
}

function looksLikeArtistName(value: string) {
  return normalizeArtist(value) !== "미상";
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

  if (Array.isArray(value)) {
    const [termValue, definitionValue, ...rest] = value;
    const listParts = rest.filter((item) => Array.isArray(item));
    const textParts = rest.filter(
      (item) =>
        typeof item === "string" && !/^(true|false|yes|no|y|n|1|0)$/i.test(item.trim()),
    );
    const booleanPart = rest.find(
      (item) =>
        typeof item === "boolean"
        || (typeof item === "string" && /^(true|false|yes|no|y|n|1|0)$/i.test(item.trim())),
    );

    return {
      term: normalizeString(termValue),
      definition: normalizeString(definitionValue) || normalizeString(termValue),
      features: listParts[0] ? normalizeStringArray(listParts[0]) : [],
      keyPoints: listParts[1]
        ? normalizeStringArray(listParts[1])
        : textParts.map((item) => item.trim()).filter(Boolean),
      likelyExam: normalizeBoolean(booleanPart),
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

  if (Array.isArray(value)) {
    const [topicValue, ...rest] = value;
    const childSource = rest.length === 1 ? rest[0] : rest;

    return {
      topic: normalizeString(topicValue),
      children: normalizeStringArray(childSource),
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
        artist: normalizeArtist(slashParts[1]),
        commentary: [],
      };
    }

    return {
      title: value,
      artist: "미상",
      commentary: [],
    };
  }

  if (Array.isArray(value)) {
    const [titleValue, ...rest] = value;
    const title = normalizeString(titleValue);
    let artist = "미상";
    let commentarySource: unknown = [];

    if (rest.length === 1) {
      if (typeof rest[0] === "string" && looksLikeArtistName(rest[0])) {
        artist = normalizeArtist(rest[0]);
      } else {
        commentarySource = rest[0];
      }
    } else if (rest.length >= 2) {
      artist = normalizeArtist(rest[0]);
      commentarySource = rest.slice(1);
    }

    return {
      title,
      artist,
      commentary: normalizeStringArray(commentarySource),
    };
  }

  if (!isRecord(value)) {
    return value;
  }

  if ("title" in value || "artist" in value || "commentary" in value) {
    const commentary = normalizeStringArray(value.commentary);
    const artist = normalizeArtist(value.artist);

    return {
      ...value,
      artist: artist === "미상" ? extractArtistFromCommentary(commentary) : artist,
      commentary,
    };
  }

  const entries = Object.entries(value);

  if (entries.length === 1) {
    const [title, rawValue] = entries[0];

    if (typeof rawValue === "string") {
      return {
        title,
        artist: "미상",
        commentary: [rawValue],
      };
    }

    if (Array.isArray(rawValue)) {
      return {
        title,
        artist: "미상",
        commentary: rawValue,
      };
    }

    if (isRecord(rawValue)) {
      const commentary = normalizeStringArray(rawValue.commentary);
      const artist = normalizeArtist(rawValue.artist);

      return {
        title,
        ...rawValue,
        artist: artist === "미상" ? extractArtistFromCommentary(commentary) : artist,
        commentary,
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

  if (Array.isArray(value)) {
    const hasType = looksLikeQuizType(value[0]);
    const offset = hasType ? 1 : 0;

    return {
      type: hasType ? value[0] : "short_answer",
      question: normalizeString(value[offset]),
      answer: normalizeString(value[offset + 1]),
      hint: normalizeString(value[offset + 2]),
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
    artist: z.preprocess(normalizeArtist, z.string()),
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
