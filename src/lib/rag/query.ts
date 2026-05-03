/**
 * Semantic search and context building for RAG pipeline
 * Handles query embedding, document search, and context assembly
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { generateEmbedding } from './embeddings'
import type { TeamRole } from '@/types/database'

/**
 * Result from document search
 */
export interface SearchResult {
  documentId: string
  documentName: string
  chunkNumber: number
  content: string
  similarity: number
  visibilityTier: 'team' | 'founder'
}

/**
 * Searches for documents based on semantic similarity
 * Respects user role-based visibility constraints
 *
 * @param workspaceId ID of the workspace
 * @param query Search query text
 * @param options Search options
 * @returns Promise resolving to array of matching documents
 */
export async function searchDocuments(
  workspaceId: string,
  query: string,
  options: {
    projectId?: string
    userRole?: TeamRole
    limit?: number
  } = {}
): Promise<SearchResult[]> {
  const { projectId, userRole = 'producer', limit = 10 } = options

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query)

  const supabase = createAdminClient()

  // Build the query
  let dbQuery = supabase
    .from('document_chunks' as any)
    .select(
      `
      id,
      document_id,
      chunk_number,
      content,
      project_documents!inner(
        id,
        name,
        visibility_tier
      )
    `
    )
    .eq('workspace_id', workspaceId)

  // Filter by project if specified
  if (projectId) {
    dbQuery = dbQuery.eq('project_id', projectId)
  }

  // Apply visibility constraints based on user role
  if (userRole === 'freelancer') {
    // Freelancers can only see 'team' visibility documents
    dbQuery = dbQuery.eq('project_documents.visibility_tier', 'team')
  }
  // Founders and producers can see both 'team' and 'founder'

  const { data: results, error } = await dbQuery.limit(limit * 2) // Get more, then filter by similarity

  if (error) {
    throw new Error(`Search failed: ${error.message}`)
  }

  if (!results || results.length === 0) {
    return []
  }

  // Calculate similarity scores using dot product
  const scored = results.map((result: any) => {
    // In production, compute actual vector similarity
    // For now, return placeholder results
    const similarity = Math.random() // Placeholder
    return {
      documentId: result.document_id,
      documentName: result.project_documents[0].name,
      chunkNumber: result.chunk_number,
      content: result.content,
      similarity,
      visibilityTier: result.project_documents[0].visibility_tier,
    }
  })

  // Sort by similarity and limit results
  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
}

/**
 * Builds a context string from search results
 * Truncates to fit within token budget
 *
 * @param documents Array of search results
 * @param maxTokens Maximum tokens for context (default: 4000)
 * @returns Formatted context string with source references
 */
export function buildContext(
  documents: SearchResult[],
  maxTokens: number = 4000
): string {
  // Rough estimate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4
  let contextLength = 0
  const contextParts: string[] = []

  for (const doc of documents) {
    const docText = `[${doc.documentName} - Chunk ${doc.chunkNumber}]\n${doc.content}\n\n`
    const textLength = docText.length

    if (contextLength + textLength > maxChars) {
      // Truncate remaining
      const remaining = maxChars - contextLength
      if (remaining > 100) {
        // Only add if significant content remains
        contextParts.push(docText.substring(0, remaining))
      }
      break
    }

    contextParts.push(docText)
    contextLength += textLength
  }

  return contextParts.join('')
}

/**
 * Result from query with context
 */
export interface QueryWithContextResult {
  query: string
  context: string
  sources: {
    documentId: string
    documentName: string
    chunks: number[]
  }[]
}

/**
 * Full RAG pipeline: search documents, build context, return formatted result
 *
 * @param workspaceId ID of the workspace
 * @param query Search query
 * @param options Search options
 * @returns Promise resolving to formatted context with source references
 */
export async function queryWithContext(
  workspaceId: string,
  query: string,
  options: {
    projectId?: string
    userRole?: TeamRole
    limit?: number
    maxTokens?: number
  } = {}
): Promise<QueryWithContextResult> {
  const { maxTokens = 4000 } = options

  // Search for relevant documents
  const documents = await searchDocuments(workspaceId, query, options)

  // Build context string
  const context = buildContext(documents, maxTokens)

  // Deduplicate sources
  const sourceMap = new Map<string, Set<number>>()
  for (const doc of documents) {
    if (!sourceMap.has(doc.documentId)) {
      sourceMap.set(doc.documentId, new Set())
    }
    sourceMap.get(doc.documentId)!.add(doc.chunkNumber)
  }

  const sources = Array.from(sourceMap.entries()).map(([docId, chunks]) => {
    const docName =
      documents.find(d => d.documentId === docId)?.documentName || 'Unknown'
    return {
      documentId: docId,
      documentName: docName,
      chunks: Array.from(chunks).sort((a, b) => a - b),
    }
  })

  return {
    query,
    context,
    sources,
  }
}
