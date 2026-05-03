/**
 * Core database types for Kit production management system
 * Defines the schema for workspaces, teams, projects, and related entities
 */

/* ============================================
   WORKSPACE & TEAM MANAGEMENT
   ============================================ */

export type TeamRole = "founder" | "producer" | "artist" | "freelancer";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  settings?: WorkspaceSettings;
}

export interface WorkspaceSettings {
  timezone: string;
  currency: string;
  notification_preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  email_on_milestone_completion: boolean;
  email_on_feedback: boolean;
  email_on_deliverable_upload: boolean;
  email_on_team_activity: boolean;
}

export interface TeamMember {
  id: string;
  workspace_id: string;
  user_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: TeamRole;
  permissions?: Permission[];
  is_active: boolean;
  joined_at: Date;
  updated_at: Date;
}

export interface Permission {
  resource: string;
  action: "read" | "write" | "delete" | "admin";
}

/* ============================================
   PROJECT MANAGEMENT
   ============================================ */

export type ProjectStatus = "planning" | "in_progress" | "in_review" | "completed" | "on_hold" | "cancelled";
export type ProjectPhase = "pre_production" | "production" | "post_production" | "delivery";

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  phase: ProjectPhase;
  budget?: number;
  currency?: string;
  start_date: Date;
  end_date: Date;
  deadline?: Date;
  client_name?: string;
  client_contact?: string;
  lead_producer_id?: string;
  team_members?: string[]; // Array of TeamMember IDs
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

/* ============================================
   PROJECT STRUCTURE & DELIVERABLES
   ============================================ */

export type MilestoneStatus = "not_started" | "in_progress" | "at_risk" | "completed" | "blocked";

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: MilestoneStatus;
  due_date: Date;
  completion_date?: Date;
  assigned_to?: string; // TeamMember ID
  deliverables: string[]; // Array of Deliverable IDs
  dependencies?: string[]; // Other Milestone IDs
  progress_percentage: number;
  created_at: Date;
  updated_at: Date;
}

export type DeliverableStatus =
  | "not_started"
  | "in_progress"
  | "in_review"
  | "approved"
  | "revision_requested"
  | "rejected"
  | "completed";

export type DeliverableFormat =
  | "video"
  | "audio"
  | "image"
  | "document"
  | "design"
  | "animation"
  | "code"
  | "other";

export interface Deliverable {
  id: string;
  milestone_id: string;
  project_id: string;
  name: string;
  description?: string;
  format: DeliverableFormat;
  status: DeliverableStatus;
  specifications?: DeliverableSpecs;
  assigned_to?: string; // TeamMember ID
  due_date: Date;
  completion_date?: Date;
  file_urls?: string[];
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface DeliverableSpecs {
  duration?: string; // For video/audio
  dimensions?: string; // For images/video (e.g., "1920x1080")
  color_space?: string; // e.g., "sRGB", "DCI-P3"
  frame_rate?: string; // e.g., "24fps", "30fps", "60fps"
  codec?: string; // e.g., "ProRes", "H.264"
  quality_notes?: string;
  [key: string]: string | undefined;
}

/* ============================================
   FEEDBACK & REVIEW CYCLE
   ============================================ */

export type FeedbackStatus = "open" | "addressed" | "resolved" | "archived";
export type FeedbackPriority = "low" | "medium" | "high" | "critical";

export interface FeedbackItem {
  id: string;
  deliverable_id: string;
  project_id: string;
  created_by_id: string; // TeamMember ID
  assigned_to_id?: string; // TeamMember ID
  content: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  type?: "comment" | "revision_request" | "approval" | "clarification";
  timestamp?: number; // For video/frame-specific feedback
  attachments?: FeedbackAttachment[];
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface FeedbackAttachment {
  url: string;
  type: string; // MIME type
  name: string;
}

/* ============================================
   TIME & RESOURCE TRACKING
   ============================================ */

export type TimeEntryCategory = "production" | "review" | "meetings" | "admin" | "revision";

export interface TimeEntry {
  id: string;
  workspace_id: string;
  team_member_id: string;
  project_id: string;
  deliverable_id?: string;
  milestone_id?: string;
  duration_minutes: number;
  category: TimeEntryCategory;
  description?: string;
  date: Date;
  notes?: string;
  billable: boolean;
  rate_per_hour?: number;
  created_at: Date;
  updated_at: Date;
}

/* ============================================
   KIT AGENT & AUTOMATION
   ============================================ */

export type ActionType =
  | "milestone_creation"
  | "deliverable_assignment"
  | "feedback_summary"
  | "schedule_optimization"
  | "budget_alert"
  | "resource_recommendation"
  | "workflow_suggestion"
  | "custom";

export type ActionStatus = "suggested" | "accepted" | "executed" | "rejected" | "pending";

export interface KitAction {
  id: string;
  workspace_id: string;
  project_id?: string;
  agent_run_id: string;
  type: ActionType;
  status: ActionStatus;
  title: string;
  description: string;
  payload?: Record<string, unknown>; // Flexible data for different action types
  confidence_score?: number; // 0-1
  reasoning?: string;
  recommended_by?: string; // Agent identifier
  executed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AgentRun {
  id: string;
  workspace_id: string;
  project_id?: string;
  triggered_by: "user" | "scheduled" | "webhook";
  trigger_source?: string;
  status: "running" | "completed" | "failed" | "partial";
  actions: string[]; // Array of KitAction IDs
  duration_ms?: number;
  error?: string;
  summary?: string;
  started_at: Date;
  completed_at?: Date;
}

/* ============================================
   DOCUMENTS & KNOWLEDGE BASE
   ============================================ */

export type DocumentVisibilityTier = "team" | "founder";
export type DocumentCategory =
  | "brief"
  | "reference"
  | "guideline"
  | "contract"
  | "budget"
  | "schedule"
  | "feedback"
  | "archive";

export interface ProjectDocument {
  id: string;
  project_id: string;
  workspace_id: string;
  name: string;
  description?: string;
  file_url: string;
  file_type: string; // MIME type
  file_size: number; // in bytes
  category: DocumentCategory;
  visibility_tier: DocumentVisibilityTier;
  uploaded_by_id: string; // TeamMember ID
  versions?: DocumentVersion[];
  tags?: string[];
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  uploaded_by_id: string; // TeamMember ID
  change_summary?: string;
  created_at: Date;
}

/* ============================================
   NOTIFICATIONS & ACTIVITY
   ============================================ */

export type ActivityEventType =
  | "project_created"
  | "project_updated"
  | "milestone_created"
  | "milestone_completed"
  | "deliverable_uploaded"
  | "feedback_added"
  | "team_member_added"
  | "document_shared"
  | "action_executed";

export interface ActivityLog {
  id: string;
  workspace_id: string;
  project_id?: string;
  actor_id: string; // TeamMember ID or system
  event_type: ActivityEventType;
  entity_id?: string;
  entity_type?: string;
  changes?: Record<string, [unknown, unknown]>; // Before/after values
  description: string;
  created_at: Date;
}

/* ============================================
   UTILITIES
   ============================================ */

export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_direction?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
