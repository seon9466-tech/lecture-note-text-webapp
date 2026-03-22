export function normalizeTranscript(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitTranscript(text: string, maxChars = 7000) {
  const normalized = normalizeTranscript(text);
  if (normalized.length <= maxChars) return [normalized];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) {
    return splitBySentence(normalized, maxChars);
  }

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current.trim());

    if (paragraph.length > maxChars) {
      chunks.push(...splitBySentence(paragraph, maxChars));
      current = "";
      continue;
    }

    current = paragraph;
  }

  if (current) chunks.push(current.trim());
  return chunks;
}

function splitBySentence(text: string, maxChars: number) {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return splitByLength(text, maxChars);
  }

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current.trim());

    if (sentence.length > maxChars) {
      chunks.push(...splitByLength(sentence, maxChars));
      current = "";
      continue;
    }

    current = sentence;
  }

  if (current) chunks.push(current.trim());
  return chunks;
}

function splitByLength(text: string, maxChars: number) {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > maxChars) {
    const slice = remaining.slice(0, maxChars);
    const breakIndex = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("\n"));
    const safeBreakIndex = breakIndex > maxChars * 0.6 ? breakIndex : maxChars;

    chunks.push(remaining.slice(0, safeBreakIndex).trim());
    remaining = remaining.slice(safeBreakIndex).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}
