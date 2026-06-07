// Results computation utilities (pure functions for portability)

export type AssessmentType = "CAT1" | "CAT2" | "EXAM";

export interface ScoreRow {
  student_id: string;
  subject_id: string;
  assessment_type: AssessmentType;
  marks: number;
}

export interface GradingScaleRow {
  min_score: number;
  max_score: number;
  grade: string;
  remarks: string | null;
}

/** Standard Competition Ranking: 1,1,3,4 */
export function competitionRank<T>(items: T[], scoreOf: (t: T) => number): Map<T, number> {
  const sorted = [...items].sort((a, b) => scoreOf(b) - scoreOf(a));
  const ranks = new Map<T, number>();
  let lastScore: number | null = null;
  let lastRank = 0;
  sorted.forEach((item, i) => {
    const s = scoreOf(item);
    const rank = lastScore !== null && s === lastScore ? lastRank : i + 1;
    ranks.set(item, rank);
    lastScore = s;
    lastRank = rank;
  });
  return ranks;
}

export function gradeFor(score: number, scales: GradingScaleRow[]): GradingScaleRow | null {
  return (
    scales.find((g) => score >= Number(g.min_score) && score <= Number(g.max_score)) ?? null
  );
}

/** Combine CAT1 (20%) + CAT2 (20%) + EXAM (60%) -> 0..100. Falls back to whatever is present. */
export function combineAssessments(
  parts: Partial<Record<AssessmentType, number>>,
): number {
  const weights: Record<AssessmentType, number> = { CAT1: 0.2, CAT2: 0.2, EXAM: 0.6 };
  let total = 0;
  let weightUsed = 0;
  (Object.keys(weights) as AssessmentType[]).forEach((k) => {
    const v = parts[k];
    if (typeof v === "number" && !Number.isNaN(v)) {
      total += v * weights[k];
      weightUsed += weights[k];
    }
  });
  if (weightUsed === 0) return 0;
  // Normalise so partial entries still produce a /100 value
  return total / weightUsed;
}

export interface StudentSubjectSummary {
  studentId: string;
  subjectId: string;
  cat1: number | null;
  cat2: number | null;
  exam: number | null;
  total: number; // combined /100
}

export function buildStudentSubjectSummaries(scores: ScoreRow[]): StudentSubjectSummary[] {
  const map = new Map<string, StudentSubjectSummary>();
  for (const s of scores) {
    const key = `${s.student_id}::${s.subject_id}`;
    let row = map.get(key);
    if (!row) {
      row = { studentId: s.student_id, subjectId: s.subject_id, cat1: null, cat2: null, exam: null, total: 0 };
      map.set(key, row);
    }
    if (s.assessment_type === "CAT1") row.cat1 = Number(s.marks);
    if (s.assessment_type === "CAT2") row.cat2 = Number(s.marks);
    if (s.assessment_type === "EXAM") row.exam = Number(s.marks);
  }
  for (const row of map.values()) {
    row.total = combineAssessments({
      CAT1: row.cat1 ?? undefined,
      CAT2: row.cat2 ?? undefined,
      EXAM: row.exam ?? undefined,
    });
  }
  return Array.from(map.values());
}
