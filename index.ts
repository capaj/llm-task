import { readFile, writeFile } from 'fs/promises'
import OpenAI from 'openai'
import type {
  DatasetEntry,
  DatasetEntryWithEmbedding,
  ComparisonResult,
  ComparisonReport,
  MatchResult
} from './types'
import cosineSimilarity from 'cos-similarity'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const BATCH_SIZE = 10
const RATE_LIMIT_DELAY = 1000

async function loadDatasets(): Promise<{
  datasetA: DatasetEntry[]
  datasetB: DatasetEntry[]
}> {
  const datasetA: DatasetEntry[] = JSON.parse(
    await readFile('datasetA.json', 'utf8')
  )
  const datasetB: DatasetEntry[] = JSON.parse(
    await readFile('datasetB.json', 'utf8')
  )

  console.log(`Loaded ${datasetA.length} entries from datasetA`)
  console.log(`Loaded ${datasetB.length} entries from datasetB`)

  return { datasetA, datasetB }
}

function createTextRepresentation(entry: DatasetEntry): string {
  return `Name: ${entry.name}\nTitle: ${entry.title}\nSummary: ${
    entry.summary
  }\nSkills: ${entry.skills.join(', ')}`
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  })
  return response.data[0].embedding
}

async function generateEmbeddingsWithBatching(
  entries: DatasetEntry[]
): Promise<DatasetEntryWithEmbedding[]> {
  const embeddings: DatasetEntryWithEmbedding[] = []

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE)

    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        entries.length / BATCH_SIZE
      )}`
    )

    const batchPromises = batch.map(
      async (entry): Promise<DatasetEntryWithEmbedding> => {
        const text = createTextRepresentation(entry)
        const embedding = await generateEmbedding(text)
        return { ...entry, embedding }
      }
    )

    const batchResults = await Promise.all(batchPromises)
    embeddings.push(...batchResults)

    if (i + BATCH_SIZE < entries.length) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))
    }
  }

  return embeddings
}

function findBestMatch(
  entryA: DatasetEntryWithEmbedding,
  datasetBWithEmbeddings: DatasetEntryWithEmbedding[]
): MatchResult {
  let bestMatch: DatasetEntryWithEmbedding | null = null
  let bestScore = -1

  for (const entryB of datasetBWithEmbeddings) {
    const similarity = cosineSimilarity(entryA.embedding, entryB.embedding)

    if (similarity > bestScore) {
      bestScore = similarity
      bestMatch = entryB
    }
  }

  if (!bestMatch) {
    throw new Error('No match found')
  }

  return { match: bestMatch, score: bestScore }
}

async function generateDiffSummary(
  entryA: DatasetEntry,
  entryB: DatasetEntry
): Promise<string | null> {
  try {
    const prompt = `Compare these two user profiles and provide a brief summary of the differences:

Profile A:
Name: ${entryA.name}
Title: ${entryA.title}
Summary: ${entryA.summary}
Skills: ${entryA.skills.join(', ')}

Profile B:
Name: ${entryB.name}
Title: ${entryB.title}
Summary: ${entryB.summary}
Skills: ${entryB.skills.join(', ')}

Provide a concise summary of the key differences (e.g., "Skills updated, title changed from 'Dev' to 'Sr. Dev'"). Focus on meaningful changes.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.3
    })

    return response.choices[0].message.content?.trim() ?? null
  } catch (error) {
    console.error('Error generating diff summary:', error)
    return 'Error generating diff summary'
  }
}

async function generateDiffSummariesWithBatching(
  comparisons: Array<{
    entryA: DatasetEntry
    match: DatasetEntry
    similarityScore: number
  }>
): Promise<ComparisonResult[]> {
  const results: ComparisonResult[] = []

  for (let i = 0; i < comparisons.length; i += BATCH_SIZE) {
    const batch = comparisons.slice(i, i + BATCH_SIZE)

    console.log(
      `Generating diff summaries for batch ${
        Math.floor(i / BATCH_SIZE) + 1
      }/${Math.ceil(comparisons.length / BATCH_SIZE)}`
    )

    const batchPromises = batch.map(
      async (comparison): Promise<ComparisonResult> => {
        const diffSummary =
          comparison.similarityScore === 1
            ? 'No differences'
            : await generateDiffSummary(comparison.entryA, comparison.match)
        return {
          entryA: comparison.entryA,
          match: comparison.match,
          similarityScore: comparison.similarityScore,
          diffSummary
        }
      }
    )

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    if (i + BATCH_SIZE < comparisons.length) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))
    }
  }

  return results
}

async function compareDatasets(): Promise<void> {
  console.log('Loading datasets...')
  const { datasetA, datasetB } = await loadDatasets()

  console.log('Generating embeddings for datasetA...')
  const datasetAWithEmbeddings = await generateEmbeddingsWithBatching(datasetA)

  console.log('Generating embeddings for datasetB...')
  const datasetBWithEmbeddings = await generateEmbeddingsWithBatching(datasetB)

  console.log('Finding best matches...')
  const comparisons = datasetAWithEmbeddings.map((entryA) => {
    const { match, score } = findBestMatch(entryA, datasetBWithEmbeddings)
    return {
      entryA: {
        id: entryA.id,
        name: entryA.name,
        title: entryA.title,
        summary: entryA.summary,
        skills: entryA.skills
      },
      match: {
        id: match.id,
        name: match.name,
        title: match.title,
        summary: match.summary,
        skills: match.skills
      },
      similarityScore: score
    }
  })

  console.log('Generating diff summaries...')
  const finalResults = await generateDiffSummariesWithBatching(comparisons)

  const report: ComparisonReport = {
    comparisonDate: new Date().toISOString(),
    totalComparisons: finalResults.length,
    results: finalResults
  }

  console.log('Saving comparison report...')
  await writeFile('comparison_report.json', JSON.stringify(report, null, 2))

  console.log(`Comparison complete! Report saved to comparison_report.json`)
  console.log(
    `Average similarity score: ${(
      finalResults.reduce((sum, r) => sum + r.similarityScore, 0) /
      finalResults.length
    ).toFixed(4)}`
  )
}

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is not set')
  console.error('Please set your OpenAI API key in a .env file or environment')
  process.exit(1)
}

compareDatasets()
