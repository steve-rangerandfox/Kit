// @ts-nocheck
/**
 * Document ingestion for RAG pipeline
 * Handles chunking, embedding, and storage of documents in Supabase
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { chunkText, generateEmbeddings } from './embeddings'
import type { DocumentVisibilityTier } from '@/types/database'

/**
 * Ingests a document into the RAG system
 * Chunks text, generates embeddings, and stores in project_documents table
 *
 * @param workspaceId ID of the workspace
 * @param projectId ID of the project
 * @param title Document title
 * @param content Document content text
 * @param docType Document type/category
 * @param visibilityTier Visibility level: 'team' or 'founder'
 * @returns Promise resolving to document ID and chunk count
 */
export async function ingestDocument(
  workspaceId: string,
  projectId: string,
  title: string,
  content: string,
  docType: string,
  visibilityTier: DocumentVisibilityTier = 'team'
): Promise<{ documentId: string; chunkCount: number }> {
  const supabase = createAdminClient()

  // Chunk the document
  const chunks = chunkText(content)

  if (chunks.length === 0) {
    throw new Error('Document produced no valid chunks')
  }

  // Generate embeddings for all chunks
  const embeddings = await generateEmbeddings(chunks)

  // Insert document record
  const { data: docData, error: docError } = await supabase
    .from('project_documents' as any)
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      name: title,
      category: docType,
      visibility_tier: visibilityTier,
      file_url: '', // No actual file stored, content is embedded
      file_type: 'text/plain',
      file_size: content.length,
      uploaded_by_id: 'system', // System ingestion
    })
    .select('id')
    .single()

  if (docError) {
    throw new Error(`Failed to insert document: ${docError.message}`)
  }

  // Insert document chunks with embeddings
  const chunkRecords = chunks.map((chunk, index) => ({
    document_id: docData.id,
    workspace_id: workspaceId,
    project_id: projectId,
    chunk_number: index,
    content: chunk,
    embedding: embeddings[index],
  }))

  const { error: chunkError } = await supabase
    .from('document_chunks' as any)
    .insert(chunkRecords)

  if (chunkError) {
    throw new Error(`Failed to insert document chunks: ${chunkError.message}`)
  }

  return {
    documentId: docData.id,
    chunkCount: chunks.length,
  }
}

interface TranscriptMetadata {
  call_date: Date
  speaker?: string
  duration_minutes?: number
}

/**
 * Ingests a transcript with call metadata
 * Uses larger overlap for conversation context
 * Routes to founder stream for sensitive content
 *
 * @param workspaceId ID of the workspace
 * @param projectId ID of the project
 * @param title Transcript title
 * @param transcript Raw transcript text
 * @param stream Visibility stream: 'team' or 'founder'
 * @param metadata Optional transcript metadata (call date, speaker, duration)
 * @returns Promise resolving to document ID and chunk count
 */
export async function ingestTranscript(
  workspaceId: string,
  projectId: string,
  title: string,
  transcript: string,
  stream: DocumentVisibilityTier,
  metadata?: TranscriptMetadata
): Promise<{ documentId: string; chunkCount: number }> {
  // Use larger overlap for conversations to preserve context
  const chunks = chunkText(transcript, 1200, 400)

  if (chunks.length === 0) {
    throw new Error('Transcript produced no valid chunks')
  }

  const supabase = createAdminClient()

  // Generate embeddings
  const embeddings = await generateEmbeddings(chunks)

  // Prepare description with metadata
  const description = metadata
    ? `Call: ${metadata.call_date.toISOString().split('T')[0]}${
        metadata.speaker ? ` with ${metadata.speaker}` : ''
      }${metadata.duration_minutes ? ` (${metadata.duration_minutes}min)` : ''}`
    : undefined

  // Insert document record
  const { data: docData, error: docError } = await supabase
    .from('project_documents' as any)
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      name: title,
      description,
      category: 'archive', // Transcripts go to archive category
      visibility_tier: stream,
      file_url: '',
      file_type: 'text/plain',
      file_size: transcript.length,
      uploaded_by_id: 'system',
    })
    .select('id')
    .single()

  if (docError) {
    throw new Error(`Failed to insert transcript document: ${docError.message}`)
  }

  // Insert document chunks with embeddings
  const chunkRecords = chunks.map((chunk, index) => ({
    document_id: docData.id,
    workspace_id: workspaceId,
    project_id: projectId,
    chunk_number: index,
    content: chunk,
    embedding: embeddings[index],
  }))

  const { error: chunkError } = await supabase
    .from('document_chunks' as any)
    .insert(chunkRecords)

  if (chunkError) {
    throw new Error(`Failed to insert transcript chunks: ${chunkError.message}`)
  }

  return {
    documentId: docData.id,
    chunkCount: chunks.length,
  }
}

/**
 * Deletes a document and all its associated chunks from the RAG system
 *
 * @param documentId ID of the document to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const supabase = createAdminClient()

  // Delete chunks first (foreign key constraint)
  const { error: chunkError } = await supabase
    .from('document_chunks' as any)
    .delete()
    .eq('document_id', documentId)

  if (chunkError) {
    throw new Error(`Failed to delete document chunks: ${chunkError.message}`)
  }

  // Delete document record
  const { error: docError } = await supabase
    .from('project_documents' as any)
    .delete()
    .eq('id', documentId)

  if (docError) {
    throw new Error(`Failed to delete document: ${docError.message}`)
  }
}
