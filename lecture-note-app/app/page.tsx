"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { LectureNote, QuizType } from "@/types/note";

type Density = "compressed" | "normal" | "detailed";

type ApiResponse = {
  note: LectureNote;
  meta: {
    usedChunking: boolean;
    chunkCount: number;
    originalChars: number;
    digestedChars: number;
    model: string;
  };
};

const sampleText = `로잘린드 크라우스는 현대 조각이 더 이상 받침대 위의 기념비 형식으로만 이해될 수 없다고 보았다. 조각은 건축도 아니고 풍경도 아닌 중간 지점에서 새롭게 정의되었고, 이러한 변화가 조각의 확장된 장을 설명하는 핵심이었다.

그녀는 모더니즘 이후 예술이 매체 순수성이라는 믿음에서 벗어났다고 보았다. 따라서 작품은 재료와 형식만이 아니라 공간 경험, 제도적 맥락, 관람자의 이동 방식까지 함께 읽어야 한다고 설명했다.

대표 작품으로는 로버트 스미드슨의 스파이럴 제티가 언급되었고, 작품이 장소와 환경 속에서 읽혀야 한다는 점이 중요하다고 했다.

* 교수님은 확장된 장의 개념, 매체 순수성 비판, 조각과 건축 및 풍경의 관계를 특히 중요하게 강조했다.`;

const densityLabels: Record<Density, string> = {
  compressed: "핵심 압축형",
  normal: "기본 균형형",
  detailed: "스토리형",
};

const quizTypeLabels: Record<QuizType, string> = {
  short_answer: "단답형",
  true_false: "OX형",
  comparison: "비교형",
};

function renderLikelyExam(value: boolean) {
  return value ? "시험 가능성 높음" : "기본 이해용";
}

function isStarred(value: string) {
  return value.trim().startsWith("*");
}

function stripStar(value: string) {
  return value.trim().replace(/^\*\s*/, "");
}

function renderArtist(value: string) {
  const normalized = stripStar(value);
  return normalized || "미상";
}

function renderMarkedText(value: string) {
  const emphasized = isStarred(value);
  const text = stripStar(value);

  return (
    <span className={emphasized ? "starredText" : undefined}>
      {emphasized ? `* ${text}` : text}
    </span>
  );
}

function renderPillList(items: string[], keyPrefix: string) {
  return (
    <div className="pillList">
      {items.map((item, index) => {
        const emphasized = isStarred(item);
        const text = stripStar(item);

        return (
          <span
            className={emphasized ? "pill starred" : "pill"}
            key={`${keyPrefix}-${index}-${text}`}
          >
            {emphasized ? `* ${text}` : text}
          </span>
        );
      })}
    </div>
  );
}

function formatListSection(title: string, items: string[]) {
  if (items.length === 0) return "";

  return [
    `[${title}]`,
    ...items.map((item) => `- ${stripStar(item)}`),
    "",
  ].join("\n");
}

function collectProfessorHighlights(note: LectureNote) {
  const candidates = [
    note.oneSentenceTheme,
    ...note.summary,
    ...note.examPoints,
    ...note.memoryLines,
    ...note.coreConcepts.flatMap((concept) => [
      concept.term,
      concept.definition,
      ...concept.features,
      ...concept.keyPoints,
    ]),
    ...note.structure.flatMap((node) => [node.topic, ...node.children]),
    ...note.works.flatMap((work) => [work.title, work.artist, ...work.commentary]),
    ...note.quiz.flatMap((quiz) => [quiz.question, quiz.answer, quiz.hint]),
  ];

  const seen = new Set<string>();
  const highlights: string[] = [];

  candidates.forEach((candidate) => {
    if (!candidate || !isStarred(candidate)) {
      return;
    }

    const normalized = stripStar(candidate);
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    highlights.push(normalized);
  });

  return highlights;
}

function buildCopyText(note: LectureNote) {
  const lines: string[] = [];
  const professorHighlights = collectProfessorHighlights(note);

  if (note.title) lines.push(note.title);
  if (note.oneSentenceTheme) lines.push(stripStar(note.oneSentenceTheme));
  lines.push("");

  if (professorHighlights.length > 0) {
    lines.push("[교수님 강조]");
    lines.push(...professorHighlights.map((item) => `- ${item}`));
    lines.push("");
  }

  if (note.summary.length > 0) {
    lines.push("[핵심 요약]");
    lines.push(...note.summary.map((item) => `- ${stripStar(item)}`));
    lines.push("");
  }

  if (note.works.length > 0) {
    lines.push("[작품 정리]");
    note.works.forEach((work) => {
      const titleLine = `- ${stripStar(work.title)} / ${renderArtist(work.artist)}`;
      lines.push(titleLine);
      work.commentary.forEach((line) => lines.push(`  - ${stripStar(line)}`));
    });
    lines.push("");
  }

  if (note.coreConcepts.length > 0) {
    lines.push("[핵심 개념]");
    note.coreConcepts.forEach((concept) => {
      lines.push(`- ${stripStar(concept.term)}`);
      lines.push(`  정의: ${stripStar(concept.definition)}`);
      if (concept.features.length > 0) {
        lines.push(`  특징: ${concept.features.map(stripStar).join(" / ")}`);
      }
      if (concept.keyPoints.length > 0) {
        lines.push(`  핵심 포인트: ${concept.keyPoints.map(stripStar).join(" / ")}`);
      }
    });
    lines.push("");
  }

  if (note.structure.length > 0) {
    lines.push("[구조 정리]");
    note.structure.forEach((node) => {
      lines.push(`- ${stripStar(node.topic)}`);
      node.children.forEach((child) => lines.push(`  - ${stripStar(child)}`));
    });
    lines.push("");
  }

  [formatListSection("시험 포인트", note.examPoints), formatListSection("암기 문장", note.memoryLines)]
    .filter(Boolean)
    .forEach((section) => lines.push(section));

  if (note.quiz.length > 0) {
    lines.push("[복습 퀴즈]");
    note.quiz.forEach((quiz, index) => {
      lines.push(`${index + 1}. (${quizTypeLabels[quiz.type]}) ${stripStar(quiz.question)}`);
      lines.push(`   정답: ${stripStar(quiz.answer)}`);
      if (quiz.hint) lines.push(`   힌트: ${stripStar(quiz.hint)}`);
    });
    lines.push("");
  }

  return lines.join("\n").trim();
}

export default function HomePage() {
  const [courseTitle, setCourseTitle] = useState("");
  const [lectureTitle, setLectureTitle] = useState("");
  const [density, setDensity] = useState<Density>("normal");
  const [withQuiz, setWithQuiz] = useState(true);
  const [sourceText, setSourceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [data, setData] = useState<ApiResponse | null>(null);

  const charCount = useMemo(() => sourceText.trim().length, [sourceText]);
  const professorHighlights = useMemo(
    () => (data ? collectProfessorHighlights(data.note) : []),
    [data],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/lecture-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseTitle,
          lectureTitle,
          density,
          withQuiz,
          sourceText,
        }),
      });

      const rawText = await response.text();
      let parsed: ApiResponse | { error?: string } | null = null;

      try {
        parsed = rawText
          ? (JSON.parse(rawText) as ApiResponse | { error?: string })
          : null;
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        const fallbackMessage = rawText
          ? `서버 오류 (${response.status}): ${rawText.slice(0, 240)}`
          : `서버 오류 (${response.status})`;

        throw new Error(
          parsed && "error" in parsed
            ? parsed.error || "강의 노트 생성에 실패했습니다."
            : fallbackMessage,
        );
      }

      if (!parsed || !("note" in parsed)) {
        throw new Error("서버 응답을 해석하지 못했습니다.");
      }

      setData(parsed);
      setCopyState("idle");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "강의 노트 생성 중 알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!data) return;

    try {
      await navigator.clipboard.writeText(buildCopyText(data.note));
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  function handleFillExample() {
    setSourceText(sampleText);
    setError("");
  }

  const copyLabel =
    copyState === "copied"
      ? "복사 완료"
      : copyState === "error"
        ? "복사 실패"
        : "노트 복사";

  return (
    <main className="pageShell">
      <section className="hero">
        <div className="heroCopy">
          <span className="eyebrow">Kitty Study Notes</span>
          <h1>강의 노트 메이커</h1>
          <p>
            강의 텍스트를 넣으면 요약, 핵심 개념, 작품 정리, 시험 포인트,
            암기 문장, 복습 퀴즈까지 한 번에 정리합니다.
          </p>
          <div className="heroList">
            <p>작품은 작가명과 함께 따로 묶어 정리합니다.</p>
            <p>교수님이 강조한 부분은 별표로 다시 보여줍니다.</p>
            <p>모바일에서도 한 장씩 읽히는 카드 흐름으로 정리합니다.</p>
          </div>
        </div>

        <div className="heroStats">
          <div className="statCard">
            <span>입력 글자 수</span>
            <strong>{charCount.toLocaleString()}</strong>
          </div>
          <div className="statCard">
            <span>정리 밀도</span>
            <strong>{densityLabels[density]}</strong>
          </div>
          <div className="statCard">
            <span>복습 퀴즈</span>
            <strong>{withQuiz ? "포함" : "미포함"}</strong>
          </div>
        </div>
      </section>

      <div className="grid">
        <section className="panel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">입력</span>
              <h2>강의 정보</h2>
            </div>
            <button
              className="button secondary"
              disabled={loading}
              type="button"
              onClick={handleFillExample}
            >
              예시 채우기
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="fieldGrid">
              <label className="formGroup">
                <span className="label">과목명</span>
                <input
                  className="input"
                  value={courseTitle}
                  onChange={(event) => setCourseTitle(event.target.value)}
                  placeholder="예: 현대미술사"
                />
              </label>

              <label className="formGroup">
                <span className="label">강의 제목</span>
                <input
                  className="input"
                  value={lectureTitle}
                  onChange={(event) => setLectureTitle(event.target.value)}
                  placeholder="예: 확장된 장과 현대 조각"
                />
              </label>
            </div>

            <div className="fieldGrid">
              <label className="formGroup">
                <span className="label">정리 밀도</span>
                <select
                  className="select"
                  value={density}
                  onChange={(event) => setDensity(event.target.value as Density)}
                >
                  <option value="compressed">핵심 압축형</option>
                  <option value="normal">기본 균형형</option>
                  <option value="detailed">스토리형</option>
                </select>
              </label>

              <label className="formGroup">
                <span className="label">복습 퀴즈</span>
                <select
                  className="select"
                  value={withQuiz ? "yes" : "no"}
                  onChange={(event) => setWithQuiz(event.target.value === "yes")}
                >
                  <option value="yes">생성</option>
                  <option value="no">생성 안 함</option>
                </select>
              </label>
            </div>

            <label className="formGroup">
              <span className="label">강의 원문</span>
              <textarea
                className="textarea"
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="강의 필기, 녹취록, 복사한 수업 자료를 여기에 붙여 넣으세요."
              />
              <span className="helper">
                긴 텍스트는 서버에서 나눠 요약한 뒤 최종 노트로 합칩니다.
              </span>
            </label>

            <div className="actions">
              <button className="button" disabled={loading} type="submit">
                {loading ? "생성 중..." : "강의 노트 만들기"}
              </button>
              <span className="helper">원문은 50자 이상 입력해야 합니다.</span>
            </div>
          </form>

          <div className="previewBlock">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">미리보기</span>
                <h3>입력 원문</h3>
              </div>
              <span className="previewCount">{charCount.toLocaleString()}자</span>
            </div>
            <pre className="preview">
              {sourceText.trim() || "아직 입력된 텍스트가 없습니다."}
            </pre>
          </div>
        </section>

        <section className="panel outputPanel">
          <div className="outputTopBar">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">출력</span>
                <h2>정리 결과</h2>
              </div>
            </div>
            <button
              className="button secondary copyButton"
              disabled={!data}
              type="button"
              onClick={handleCopy}
            >
              {copyLabel}
            </button>
          </div>

          {!data && !error && (
            <div className="emptyState">
              <p>
                왼쪽에 강의 원문을 넣고 생성하면 결과가 여기에 표시됩니다.
                별표 항목은 교수님이 특히 강조한 내용입니다.
              </p>
            </div>
          )}

          {error && <div className="error">{error}</div>}

          {data && (
            <div className="resultStack">
              <div className="badgeRow">
                <span className="badge">모델 {data.meta.model}</span>
                <span className="badge">원문 {data.meta.originalChars.toLocaleString()}자</span>
                <span className="badge">요약 입력 {data.meta.digestedChars.toLocaleString()}자</span>
                {data.meta.usedChunking && (
                  <span className="badge">자동 분할 {data.meta.chunkCount}개</span>
                )}
              </div>

              <section className="outputSection">
                <h3>{data.note.title}</h3>
                <p className="lead">{renderMarkedText(data.note.oneSentenceTheme)}</p>
              </section>

              {professorHighlights.length > 0 && (
                <section className="outputSection">
                  <h3>교수님 강조</h3>
                  <ul className="bulletList">
                    {professorHighlights.map((item, index) => (
                      <li className="starredItem" key={`professor-${index}-${item}`}>
                        <span className="starredText">{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="outputSection">
                <h3>핵심 요약</h3>
                <ul className="bulletList">
                  {data.note.summary.map((item, index) => (
                    <li
                      className={isStarred(item) ? "starredItem" : undefined}
                      key={`summary-${index}-${item}`}
                    >
                      {renderMarkedText(item)}
                    </li>
                  ))}
                </ul>
              </section>

              {data.note.works.length > 0 && (
                <section className="outputSection">
                  <h3>작품 정리</h3>
                  <div className="workList">
                    {data.note.works.map((work, index) => (
                      <article className="workCard" key={`work-${index}-${work.title}`}>
                        <h4>{stripStar(work.title)}<span className="workMeta"> / {renderArtist(work.artist)}</span></h4>
                        <ul className="bulletList">
                          {work.commentary.map((line, lineIndex) => (
                            <li
                              className={isStarred(line) ? "starredItem" : undefined}
                              key={`work-line-${index}-${lineIndex}-${line}`}
                            >
                              {renderMarkedText(line)}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <section className="outputSection">
                <h3>핵심 개념</h3>
                <div className="conceptList">
                  {data.note.coreConcepts.map((concept, index) => (
                    <article
                      className="conceptCard"
                      key={`concept-${index}-${concept.term}`}
                    >
                      <div className="conceptHeader">
                        <h4>{stripStar(concept.term)}</h4>
                        <span className="chip">
                          {renderLikelyExam(concept.likelyExam)}
                        </span>
                      </div>
                      <div className="kv">
                        <strong>정의</strong>
                        <span>{renderMarkedText(concept.definition)}</span>
                      </div>
                      <div className="kv">
                        <strong>특징</strong>
                        <div>{renderPillList(concept.features, `feature-${index}`)}</div>
                      </div>
                      <div className="kv">
                        <strong>핵심 포인트</strong>
                        <div>{renderPillList(concept.keyPoints, `keypoint-${index}`)}</div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="outputSection">
                <h3>구조 정리</h3>
                <div className="structureList">
                  {data.note.structure.map((node, index) => (
                    <article
                      className="structureCard"
                      key={`structure-${index}-${node.topic}`}
                    >
                      <h4>{stripStar(node.topic)}</h4>
                      <ul className="bulletList">
                        {node.children.map((child, childIndex) => (
                          <li
                            className={isStarred(child) ? "starredItem" : undefined}
                            key={`child-${index}-${childIndex}-${child}`}
                          >
                            {renderMarkedText(child)}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>

              <section className="outputSection">
                <h3>시험 포인트</h3>
                <ul className="bulletList">
                  {data.note.examPoints.map((item, index) => (
                    <li
                      className={isStarred(item) ? "starredItem" : undefined}
                      key={`exam-${index}-${item}`}
                    >
                      {renderMarkedText(item)}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="outputSection">
                <h3>암기 문장</h3>
                <ul className="bulletList">
                  {data.note.memoryLines.map((item, index) => (
                    <li
                      className={isStarred(item) ? "starredItem" : undefined}
                      key={`memory-${index}-${item}`}
                    >
                      {renderMarkedText(item)}
                    </li>
                  ))}
                </ul>
              </section>

              {data.note.quiz.length > 0 && (
                <section className="outputSection">
                  <h3>복습 퀴즈</h3>
                  <div className="quizList">
                    {data.note.quiz.map((quiz, index) => (
                      <article className="quizCard" key={`${quiz.type}-${index}`}>
                        <div className="conceptHeader">
                          <h4>
                            {index + 1}. {stripStar(quiz.question)}
                          </h4>
                          <span className="chip">{quizTypeLabels[quiz.type]}</span>
                        </div>
                        <div className="kv">
                          <strong>정답</strong>
                          <span>{renderMarkedText(quiz.answer)}</span>
                        </div>
                        {quiz.hint && (
                          <div className="kv">
                            <strong>힌트</strong>
                            <span>{renderMarkedText(quiz.hint)}</span>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
