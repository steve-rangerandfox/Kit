// tests/orchestrator.test.ts

import { runOrchestrator } from '../src/orchestrator';
import { OrchestratorContext } from '../src/orchestrator/types';

// Mock all service modules
jest.mock('../src/services/dropbox',  () => ({ provisionDropbox:  jest.fn() }));
jest.mock('../src/services/frameio',  () => ({ provisionFrameIo:  jest.fn() }));
jest.mock('../src/services/canva',    () => ({ provisionCanva:    jest.fn() }));
jest.mock('../src/services/onedrive', () => ({ provisionOneDrive: jest.fn() }));
jest.mock('../src/services/clockify', () => ({ provisionClockify: jest.fn() }));
jest.mock('../src/services/figma',    () => ({ provisionFigma:    jest.fn() }));
jest.mock('../src/services/notion',   () => ({
  createNotionPage:          jest.fn(),
  patchNotionPageWithLinks:  jest.fn(),
}));
jest.mock('../src/services/teams', () => ({ provisionTeamsChat: jest.fn() }));

import { provisionDropbox }  from '../src/services/dropbox';
import { provisionFrameIo }  from '../src/services/frameio';
import { provisionCanva }    from '../src/services/canva';
import { provisionOneDrive } from '../src/services/onedrive';
import { provisionClockify } from '../src/services/clockify';
import { provisionFigma }    from '../src/services/figma';
import { createNotionPage, patchNotionPageWithLinks } from '../src/services/notion';
import { provisionTeamsChat } from '../src/services/teams';

const mockDropbox  = provisionDropbox  as jest.MockedFunction<typeof provisionDropbox>;
const mockFrameIo  = provisionFrameIo  as jest.MockedFunction<typeof provisionFrameIo>;
const mockCanva    = provisionCanva    as jest.MockedFunction<typeof provisionCanva>;
const mockOneDrive = provisionOneDrive as jest.MockedFunction<typeof provisionOneDrive>;
const mockClockify = provisionClockify as jest.MockedFunction<typeof provisionClockify>;
const mockFigma    = provisionFigma    as jest.MockedFunction<typeof provisionFigma>;
const mockNotionCreate = createNotionPage as jest.MockedFunction<typeof createNotionPage>;
const mockNotionPatch  = patchNotionPageWithLinks as jest.MockedFunction<typeof patchNotionPageWithLinks>;
const mockTeams    = provisionTeamsChat as jest.MockedFunction<typeof provisionTeamsChat>;

const testCtx: OrchestratorContext = {
  form: {
    projectName: 'Test Project',
    clientName: 'Test Client',
    projectType: 'Brand Video',
    projectManager: 'pm@studio.com',
    teamMembers: ['dev@studio.com'],
  },
  conversationId: 'conv-id',
  serviceUrl: 'https://smba.trafficmanager.net/teams/',
  tenantId: 'tenant-id',
  dryRun: true,
};

beforeEach(() => jest.clearAllMocks());

describe('runOrchestrator', () => {
  beforeEach(() => {
    // Set up happy-path mocks
    mockDropbox.mockResolvedValue({ service: 'Dropbox', success: true, url: 'https://dropbox.com/test' });
    mockFrameIo.mockResolvedValue({ service: 'FrameIo', success: true, url: 'https://app.frame.io/test' });
    mockCanva.mockResolvedValue({ service: 'Canva', success: true, url: 'https://canva.com/folder/test' });
    mockOneDrive.mockResolvedValue({ service: 'OneDrive', success: true, url: 'https://onedrive.com/test' });
    mockClockify.mockResolvedValue({ service: 'Clockify', success: true, url: 'https://clockify.me/test' });
    mockFigma.mockResolvedValue({ service: 'FigJam', success: true, url: 'https://figma.com/file/test' });
    mockNotionCreate.mockResolvedValue({ service: 'Notion', success: true, url: 'https://notion.so/test', id: 'page-id', pageId: 'page-id' });
    mockTeams.mockResolvedValue({ service: 'Teams', success: true, url: 'https://teams.microsoft.com/test' });
    mockNotionPatch.mockResolvedValue(undefined);
  });

  it('runs all services and returns results', async () => {
    const results = await runOrchestrator(testCtx);

    expect(results.dropbox?.success).toBe(true);
    expect(results.frameio?.success).toBe(true);
    expect(results.canva?.success).toBe(true);
    expect(results.onedrive?.success).toBe(true);
    expect(results.clockify?.success).toBe(true);
    expect(results.figma?.success).toBe(true);
    expect(results.notion?.success).toBe(true);
    expect(results.teams?.success).toBe(true);
  });

  it('calls Notion patch after all services complete', async () => {
    await runOrchestrator(testCtx);
    expect(mockNotionPatch).toHaveBeenCalledWith(
      'page-id',
      expect.objectContaining({ dropboxUrl: 'https://dropbox.com/test' }),
      true
    );
  });

  it('continues when a parallel service fails', async () => {
    mockDropbox.mockRejectedValue(new Error('Dropbox is down'));

    const results = await runOrchestrator(testCtx);

    // Dropbox should be marked failed, everything else succeeds
    expect(results.dropbox?.success).toBe(false);
    expect(results.frameio?.success).toBe(true);
    expect(results.notion?.success).toBe(true);
  });

  it('still creates Notion page when all parallel services fail', async () => {
    mockDropbox.mockRejectedValue(new Error('fail'));
    mockFrameIo.mockRejectedValue(new Error('fail'));
    mockCanva.mockRejectedValue(new Error('fail'));
    mockOneDrive.mockRejectedValue(new Error('fail'));
    mockClockify.mockRejectedValue(new Error('fail'));
    mockFigma.mockRejectedValue(new Error('fail'));

    const results = await runOrchestrator(testCtx);
    expect(mockNotionCreate).toHaveBeenCalled();
    expect(results.notion?.success).toBe(true);
  });

  it('calls onProgress callback for each phase', async () => {
    const onProgress = jest.fn().mockResolvedValue(undefined);
    await runOrchestrator(testCtx, onProgress);

    expect(onProgress).toHaveBeenCalledWith('phase1', expect.any(String));
    expect(onProgress).toHaveBeenCalledWith('phase1_complete', expect.any(String));
    expect(onProgress).toHaveBeenCalledWith('phase2', expect.any(String));
    expect(onProgress).toHaveBeenCalledWith('phase3', expect.any(String));
    expect(onProgress).toHaveBeenCalledWith('phase4', expect.any(String));
  });

  it('skips Notion patch if Notion page creation fails', async () => {
    mockNotionCreate.mockResolvedValue({ service: 'Notion', success: false, error: 'DB not found' });

    await runOrchestrator(testCtx);
    expect(mockNotionPatch).not.toHaveBeenCalled();
  });
});
