# Dataset Comparison App

A TypeScript/Bun application that compares two datasets using OpenAI's LLM to identify semantically similar entries and highlight differences.

## Features

- **Semantic Similarity**: Uses OpenAI's text-embedding-3-small model to find the most similar entries between datasets
- **Diff Summaries**: Generates human-readable difference summaries using GPT-3.5-turbo
- **Batching & Rate Limiting**: Handles API rate limits with intelligent batching
- **Detailed Reports**: Outputs comprehensive JSON reports with similarity scores and diff summaries
- **TypeScript**: Full type safety with proper interfaces and type checking
- **Bun Runtime**: Fast execution with built-in TypeScript support

## Requirements

- [Bun](https://bun.sh/) runtime (v1.0.0 or higher)
- OpenAI API key

## Setup

1. **Install Bun** (if not already installed):

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Install dependencies**:

   ```bash
   bun install
   ```

3. **Set up OpenAI API key**:
   Create a `.env` file in the project root:

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Ensure datasets are present**:
   Make sure `datasetA.json` and `datasetB.json` are in the project root directory.

## Usage

Run the comparison:

```bash
bun start
```

The application will:

1. Load both datasets
2. Generate embeddings for all entries
3. Find the best semantic matches
4. Generate diff summaries using LLM
5. Save results to `comparison_report.json`

## Dataset Format

Each dataset should be a JSON array of objects with the following structure:

```json
[
  {
    "id": 12345,
    "name": "John Doe",
    "title": "Software Engineer",
    "summary": "Experienced developer with...",
    "skills": ["JavaScript", "Python", "React"]
  }
]
```

## Output Format

The generated `comparison_report.json` contains:

```json
{
  "comparisonDate": "2024-01-15T10:30:00.000Z",
  "totalComparisons": 100,
  "results": [
    {
      "entryA": {
        /* Original entry from datasetA */
      },
      "matchedEntryB": {
        /* Best match from datasetB */
      },
      "similarityScore": 0.8745,
      "diffSummary": "Skills updated, title changed from 'Dev' to 'Sr. Dev'"
    }
  ]
}
```

## Type Definitions

The application uses TypeScript interfaces for type safety:

- `DatasetEntry`: Core dataset entry structure
- `DatasetEntryWithEmbedding`: Entry with embedding vector
- `ComparisonResult`: Result of comparing two entries
- `ComparisonReport`: Complete comparison report structure
- `MatchResult`: Result of finding best match

## Configuration

- **BATCH_SIZE**: Number of entries processed in parallel (default: 10)
- **RATE_LIMIT_DELAY**: Delay between batches in milliseconds (default: 1000)
- **Embedding Model**: text-embedding-3-small (OpenAI)
- **Chat Model**: gpt-3.5-turbo (OpenAI)

## Error Handling

The application includes comprehensive error handling for:

- Missing API keys
- Dataset loading failures
- API rate limit issues
- Embedding generation errors
- File system operations

## Performance Notes

- Uses cosine similarity for efficient vector comparison
- Implements batching to respect OpenAI's rate limits
- Progress tracking for long-running operations
- Memory-efficient processing of large datasets
- Bun's fast runtime for improved performance

## Development

For development with TypeScript type checking:

```bash
bun run dev
```

The project includes a `tsconfig.json` optimized for Bun with strict type checking enabled.
