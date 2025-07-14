export interface DatasetEntry {
  id: number
  name: string
  title: string
  summary: string
  skills: string[]
}

export interface DatasetEntryWithEmbedding extends DatasetEntry {
  embedding: number[]
}

export interface ComparisonResult {
  entryA: DatasetEntry
  match: DatasetEntry
  similarityScore: number
  diffSummary: string | null
}

export interface ComparisonReport {
  comparisonDate: string
  totalComparisons: number
  results: ComparisonResult[]
}

export interface MatchResult {
  match: DatasetEntryWithEmbedding
  score: number
}
