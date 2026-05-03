// @ts-nocheck
/**
 * Clockify integration adapter
 * Syncs time entries from Clockify to Kit
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { IntegrationAdapter } from './adapter'
import type { TimeEntry, TimeEntryCategory } from '@/types/database'

/**
 * Clockify time entry from their API
 */
interface ClockifyTimeEntry {
  id: string
  workspaceId: string
  userId: string
  userName: string
  projectId?: string
  projectName?: string
  taskId?: string
  taskName?: string
  description: string
  tagIds: string[]
  isLocked: boolean
  billable: boolean
  duration: number // milliseconds
  timeInterval: {
    start: string // ISO 8601
    end?: string // ISO 8601
  }
  customFields?: Array<{
    customFieldId: string
    customFieldName: string
    value: string | number | boolean
  }>
}

/**
 * Clockify adapter implementation
 */
export const clockifyAdapter: IntegrationAdapter = {
  name: 'Clockify',

  /**
   * Tests Clockify API connection by verifying the API key
   */
  async testConnection(config: Record<string, unknown>): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const apiKey = config.apiKey as string
      if (!apiKey) {
        return { success: false, error: 'API key is required' }
      }

      const response = await fetch('https://api.clockify.me/api/v1/user', {
        headers: {
          'X-Api-Key': apiKey,
        },
      })

      if (!response.ok) {
        return {
          success: false,
          error: `API request failed with status ${response.status}`,
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  /**
   * Syncs time entries from Clockify to Kit
   */
  async sync(
    workspaceId: string,
    config: Record<string, unknown>
  ): Promise<{ synced: number; errors: string[] }> {
    try {
      const apiKey = config.apiKey as string
      const clockifyWorkspaceId = config.clockifyWorkspaceId as string
      const since = (config.since as string) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Last 7 days default

      if (!apiKey || !clockifyWorkspaceId) {
        return {
          synced: 0,
          errors: ['API key and Clockify workspace ID are required'],
        }
      }

      const entries = await fetchTimeEntries(
        apiKey,
        clockifyWorkspaceId,
        new Date(since)
      )

      const result = await syncTimeEntries(workspaceId, entries)
      return result
    } catch (error) {
      return {
        synced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  },
}

/**
 * Fetches time entries from Clockify API
 */
async function fetchTimeEntries(
  apiKey: string,
  workspaceId: string,
  since: Date
): Promise<ClockifyTimeEntry[]> {
  const entries: ClockifyTimeEntry[] = []
  let page = 1
  const pageSize = 50

  while (true) {
    const response = await fetch(
      `https://api.clockify.me/api/v1/workspaces/${workspaceId}/time-entries?page=${page}&pageSize=${pageSize}&start=${since.toISOString()}`,
      {
        headers: {
          'X-Api-Key': apiKey,
        },
      }
    )

    if (!response.ok) {
      throw new Error(
        `Failed to fetch time entries: ${response.statusText}`
      )
    }

    const data: ClockifyTimeEntry[] = await response.json()
    if (data.length === 0) break

    entries.push(...data)
    page++
  }

  return entries
}

/**
 * Maps Clockify category to Kit category
 */
function mapCategory(clockifyEntry: ClockifyTimeEntry): TimeEntryCategory {
  const description = clockifyEntry.description.toLowerCase()
  const taskName = clockifyEntry.taskName?.toLowerCase() || ''

  if (
    description.includes('review') ||
    description.includes('feedback') ||
    taskName.includes('review')
  ) {
    return 'review'
  }

  if (
    description.includes('meeting') ||
    description.includes('call') ||
    taskName.includes('meeting')
  ) {
    return 'meetings'
  }

  if (
    description.includes('admin') ||
    description.includes('setup') ||
    taskName.includes('admin')
  ) {
    return 'admin'
  }

  if (
    description.includes('revision') ||
    description.includes('rework') ||
    taskName.includes('revision')
  ) {
    return 'revision'
  }

  return 'production'
}

/**
 * Syncs fetched time entries to Kit database
 */
async function syncTimeEntries(
  workspaceId: string,
  clockifyEntries: ClockifyTimeEntry[]
): Promise<{ synced: number; errors: string[] }> {
  const supabase = createAdminClient()
  const errors: string[] = []
  let synced = 0

  for (const entry of clockifyEntries) {
    try {
      const durationMinutes = Math.round(entry.duration / 60000) // Convert ms to minutes

      const kitEntry = {
        workspace_id: workspaceId,
        team_member_id: entry.userId,
        project_id: entry.projectId || null,
        duration_minutes: durationMinutes,
        category: mapCategory(entry),
        description: entry.description,
        date: new Date(entry.timeInterval.start),
        billable: entry.billable,
        external_id: `clockify_${entry.id}`,
      }

      // Upsert to avoid duplicates
      const { error } = await supabase
        .from('time_entries' as any)
        .upsert(kitEntry, {
          onConflict: 'external_id',
        })

      if (error) {
        errors.push(`Failed to sync entry ${entry.id}: ${error.message}`)
      } else {
        synced++
      }
    } catch (error) {
      errors.push(
        `Error processing entry ${entry.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  return { synced, errors }
}

/**
 * Creates a new time entry in Clockify
 */
export async function createTimeEntry(
  apiKey: string,
  clockifyWorkspaceId: string,
  entry: {
    userId: string
    projectId?: string
    taskId?: string
    description: string
    start: Date
    duration: number // minutes
    billable?: boolean
  }
): Promise<string> {
  const response = await fetch(
    `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/time-entries`,
    {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: entry.userId,
        projectId: entry.projectId,
        taskId: entry.taskId,
        description: entry.description,
        start: entry.start.toISOString(),
        duration: {
          minutes: entry.duration,
        },
        billable: entry.billable ?? false,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to create time entry: ${response.statusText}`)
  }

  const data: ClockifyTimeEntry = await response.json()
  return data.id
}

/**
 * Updates an existing time entry in Clockify
 */
export async function updateTimeEntry(
  apiKey: string,
  clockifyWorkspaceId: string,
  clockifyEntryId: string,
  updates: Partial<{
    description: string
    duration: number // minutes
    billable: boolean
  }>
): Promise<void> {
  const response = await fetch(
    `https://api.clockify.me/api/v1/workspaces/${clockifyWorkspaceId}/time-entries/${clockifyEntryId}`,
    {
      method: 'PUT',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: updates.description,
        ...(updates.duration && { duration: { minutes: updates.duration } }),
        billable: updates.billable,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to update time entry: ${response.statusText}`)
  }
}
