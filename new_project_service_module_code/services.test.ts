// tests/services.test.ts

import axios from 'axios';
import { provisionDropbox }   from '../src/services/dropbox';
import { provisionFrameIo }   from '../src/services/frameio';
import { provisionCanva }     from '../src/services/canva';
import { provisionClockify }  from '../src/services/clockify';
import { provisionFigma }     from '../src/services/figma';
import { createNotionPage, patchNotionPageWithLinks } from '../src/services/notion';
import { clearGraphTokenCache } from '../src/services/graphAuth';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Set dummy env vars before all tests
beforeAll(() => {
  process.env.DROPBOX_ACCESS_TOKEN   = 'test-dropbox-token';
  process.env.DROPBOX_TEMPLATE_PATH  = '/_TEMPLATES/New Project Template';
  process.env.FRAMEIO_TOKEN          = 'test-frameio-token';
  process.env.FRAMEIO_TEAM_ID        = 'team-abc';
  process.env.CANVA_ACCESS_TOKEN     = 'test-canva-token';
  process.env.CANVA_ROOT_FOLDER_ID   = 'root-folder-id';
  process.env.CLOCKIFY_API_KEY       = 'test-clockify-key';
  process.env.CLOCKIFY_WORKSPACE_ID  = 'workspace-id';
  process.env.FIGMA_TOKEN            = 'test-figma-token';
  process.env.FIGMA_TEMPLATE_FILE_KEY = 'template-file-key';
  process.env.NOTION_TOKEN           = 'test-notion-token';
  process.env.NOTION_PROJECTS_DB_ID  = 'db-id';
  process.env.AZURE_TENANT_ID        = 'tenant-id';
  process.env.AZURE_CLIENT_ID        = 'client-id';
  process.env.AZURE_CLIENT_SECRET    = 'client-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  clearGraphTokenCache();
});

// ─── Dropbox ─────────────────────────────────────────────────────────────────

describe('provisionDropbox', () => {
  it('returns dry-run result without making API calls', async () => {
    const result = await provisionDropbox('My Project', 'Acme', true);
    expect(result.success).toBe(true);
    expect(result.service).toBe('Dropbox');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('copies template and returns shared link on success', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { metadata: { path_display: '/Clients/Acme/My Project' } } }) // copy
      .mockResolvedValueOnce({ data: { url: 'https://dropbox.com/sh/abc123' } }); // shared link

    const result = await provisionDropbox('My Project', 'Acme');
    expect(result.success).toBe(true);
    expect(result.url).toBe('https://dropbox.com/sh/abc123');
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it('returns failure result on API error', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network error'));
    const result = await provisionDropbox('My Project', 'Acme');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });
});

// ─── Frame.io ────────────────────────────────────────────────────────────────

describe('provisionFrameIo', () => {
  it('returns dry-run result without making API calls', async () => {
    const result = await provisionFrameIo('My Project', 'Acme', true);
    expect(result.success).toBe(true);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('creates project and subfolders on success', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({
        data: { id: 'proj-id', root_asset_id: 'root-asset-id' },
      }) // project create
      .mockResolvedValue({ data: { id: 'folder-id' } }); // subfolder creates (×6)

    const result = await provisionFrameIo('My Project', 'Acme');
    expect(result.success).toBe(true);
    expect(result.url).toContain('proj-id');
    expect(result.id).toBe('proj-id');
  });

  it('returns failure result when project creation fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Unauthorized'));
    const result = await provisionFrameIo('My Project', 'Acme');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });
});

// ─── Canva ───────────────────────────────────────────────────────────────────

describe('provisionCanva', () => {
  it('returns dry-run result without making API calls', async () => {
    const result = await provisionCanva('My Project', 'Acme', true);
    expect(result.success).toBe(true);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('creates folder and returns correct URL', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { folder: { id: 'canva-folder-id' } },
    });
    const result = await provisionCanva('My Project', 'Acme');
    expect(result.success).toBe(true);
    expect(result.url).toBe('https://www.canva.com/folder/canva-folder-id');
  });

  it('returns failure on API error', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Rate limited'));
    const result = await provisionCanva('My Project', 'Acme');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Rate limited');
  });
});

// ─── Clockify ────────────────────────────────────────────────────────────────

describe('provisionClockify', () => {
  it('returns dry-run result without making API calls', async () => {
    const result = await provisionClockify('My Project', 'Acme', true);
    expect(result.success).toBe(true);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('creates project and default tasks', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { id: 'clockify-proj-id' } }) // project
      .mockResolvedValue({ data: { id: 'task-id' } }); // tasks

    const result = await provisionClockify('My Project', 'Acme');
    expect(result.success).toBe(true);
    expect(result.url).toContain('clockify-proj-id');
  });

  it('returns failure on API error', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Invalid API key'));
    const result = await provisionClockify('My Project', 'Acme');
    expect(result.success).toBe(false);
  });
});

// ─── Figma ───────────────────────────────────────────────────────────────────

describe('provisionFigma', () => {
  it('returns dry-run result without making API calls', async () => {
    const result = await provisionFigma('My Project', 'Acme', true);
    expect(result.success).toBe(true);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('duplicates template and renames file', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { key: 'new-file-key' } });
    mockedAxios.patch = jest.fn().mockResolvedValueOnce({ data: {} });

    const result = await provisionFigma('My Project', 'Acme');
    expect(result.success).toBe(true);
    expect(result.url).toBe('https://www.figma.com/file/new-file-key');
  });

  it('returns failure on duplicate error', async () => {
    mockedAxios.post.mockRejectedValue(new Error('File not found'));
    const result = await provisionFigma('My Project', 'Acme');
    expect(result.success).toBe(false);
    expect(result.error).toContain('File not found');
  });
});

// ─── Notion ──────────────────────────────────────────────────────────────────

describe('createNotionPage', () => {
  const testForm = {
    projectName: 'Test Project',
    clientName: 'Test Client',
    projectType: 'Brand Video' as const,
    projectManager: 'pm@studio.com',
    teamMembers: ['dev@studio.com'],
    startDate: '2025-01-01',
    deadline: '2025-03-01',
    description: 'A test project',
  };

  it('returns dry-run result without making API calls', async () => {
    const result = await createNotionPage(testForm, true);
    expect(result.success).toBe(true);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('creates page and returns id and url', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { id: 'notion-page-id', url: 'https://notion.so/notion-page-id' },
    });
    const result = await createNotionPage(testForm);
    expect(result.success).toBe(true);
    expect(result.id).toBe('notion-page-id');
    expect(result.url).toBe('https://notion.so/notion-page-id');
  });

  it('returns failure on API error', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Database not found'));
    const result = await createNotionPage(testForm);
    expect(result.success).toBe(false);
  });
});

describe('patchNotionPageWithLinks', () => {
  it('skips call in dry-run mode', async () => {
    mockedAxios.patch = jest.fn();
    await patchNotionPageWithLinks('page-id', { dropboxUrl: 'https://dropbox.com/test' }, true);
    expect(mockedAxios.patch).not.toHaveBeenCalled();
  });

  it('patches page with provided links', async () => {
    mockedAxios.patch = jest.fn().mockResolvedValueOnce({ data: {} });
    await patchNotionPageWithLinks('page-id', {
      dropboxUrl: 'https://dropbox.com/test',
      frameioUrl: 'https://app.frame.io/projects/test',
    });
    expect(mockedAxios.patch).toHaveBeenCalledTimes(1);
  });
});
