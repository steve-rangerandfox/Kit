// src/orchestrator/types.ts

/** Keys that map 1:1 to the svc_* toggle IDs in the Adaptive Card */
export type ServiceKey =
  | 'dropbox'
  | 'frameio'
  | 'canva'
  | 'onedrive'
  | 'clockify'
  | 'figma'
  | 'notion'
  | 'teams';

/** Full set of all available services — used as the default when nothing is deselected */
export const ALL_SERVICES: ServiceKey[] = [
  'dropbox', 'frameio', 'canva', 'onedrive', 'clockify', 'figma', 'notion', 'teams',
];

export interface ProjectIntakeForm {
  projectName: string;
  clientName: string;
  projectType: ProjectType;
  projectManager: string;
  teamMembers: string[]; // array of email addresses
  startDate?: string;    // ISO date string
  deadline?: string;     // ISO date string
  description?: string;
  /** Which services the user selected on the intake card. Defaults to ALL_SERVICES. */
  selectedServices: ServiceKey[];
}

export type ProjectType =
  | 'Brand Video'
  | 'Motion Graphics'
  | 'Social Campaign'
  | 'Explainer'
  | 'Broadcast'
  | 'Other';

// ─── Service result types ────────────────────────────────────────────────────

export interface ServiceResult {
  service: ServiceName;
  success: boolean;
  url?: string;
  id?: string;
  error?: string;
}

export type ServiceName =
  | 'Dropbox'
  | 'FrameIo'
  | 'Canva'
  | 'OneDrive'
  | 'Clockify'
  | 'FigJam'
  | 'Notion'
  | 'Teams';

export interface ProvisioningResults {
  dropbox?: ServiceResult;
  frameio?: ServiceResult;
  canva?: ServiceResult;
  onedrive?: ServiceResult;
  clockify?: ServiceResult;
  figma?: ServiceResult;
  notion?: ServiceResult;
  teams?: ServiceResult;
}

export interface OrchestratorContext {
  form: ProjectIntakeForm;
  conversationId: string;
  serviceUrl: string;
  tenantId: string;
  activityId?: string;
  dryRun?: boolean;
}

// ─── Notion property map used for patching ───────────────────────────────────

export interface NotionLinkProperties {
  dropboxUrl?: string;
  frameioUrl?: string;
  teamsUrl?: string;
  canvaUrl?: string;
  onedriveUrl?: string;
  clockifyUrl?: string;
  figjamUrl?: string;
}

// ─── Folder structure ────────────────────────────────────────────────────────

export interface FolderNode {
  name: string;
  children?: FolderNode[];
}
