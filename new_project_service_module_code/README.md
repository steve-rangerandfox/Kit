# New Project Provisioner

A Microsoft Teams bot that accepts a project intake form via Adaptive Card and automatically provisions all project infrastructure across 8 platforms — then links everything together in Notion.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Microsoft Teams                                                         │
│                                                                          │
│   User types /newproject                                                 │
│        │                                                                 │
│        ▼                                                                 │
│   [Adaptive Card Intake Form]                                            │
│        │  (submit)                                                       │
└────────┼─────────────────────────────────────────────────────────────────┘
         │
         ▼ HTTPS POST /api/messages
┌──────────────────────────────────────────────────────────────────────────┐
│  Azure Function (Consumption Plan)                                        │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Bot Framework Adapter + ProjectProvisionerBot                       │ │
│  │    - Parses Adaptive Card payload                                    │ │
│  │    - Validates form fields                                           │ │
│  │    - Captures conversation reference                                 │ │
│  │    - Kicks off async orchestration                                   │ │
│  └──────────────────────┬──────────────────────────────────────────────┘ │
│                         │                                                 │
│  ┌──────────────────────▼──────────────────────────────────────────────┐ │
│  │  Orchestrator                                                         │ │
│  │                                                                       │ │
│  │  Phase 1 — Promise.allSettled (parallel)                             │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │
│  │  │ Dropbox  │ │ Frame.io │ │  Canva   │ │ OneDrive │ │ Clockify │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │ │
│  │                                         ┌──────────┐                 │ │
│  │                                         │  FigJam  │                 │ │
│  │                                         └──────────┘                 │ │
│  │                                                                       │ │
│  │  Phase 2 — Sequential                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────────┐    │ │
│  │  │  Create Notion Page  →  Create Teams Chat  →  Patch Notion   │    │ │
│  │  └──────────────────────────────────────────────────────────────┘    │ │
│  └──────────────────────┬──────────────────────────────────────────────┘ │
│                         │                                                 │
│  ┌──────────────────────▼──────────────────────────────────────────────┐ │
│  │  Final Summary Adaptive Card  →  Posted back to Teams conversation  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘

External Services:
  Dropbox API v2  │  Frame.io API v2  │  Canva Connect API  │  OneDrive Graph API
  Clockify API v1  │  Figma API v1     │  Notion API v1      │  Teams Graph API
```

---

## Repository Structure

```
/new-project-provisioner
  /src
    /bot
      bot.ts                # Teams bot logic, Adaptive Card handling
      adaptiveCard.json     # Adaptive Card schema for project intake
      summaryCard.ts        # Final summary Adaptive Card builder
    /services
      dropbox.ts            # Dropbox API integration
      frameio.ts            # Frame.io API integration
      notion.ts             # Notion API integration (create + patch)
      teams.ts              # Teams/Graph API integration
      canva.ts              # Canva Connect API integration
      onedrive.ts           # OneDrive/Graph API integration
      clockify.ts           # Clockify API integration
      figma.ts              # Figma API integration
      graphAuth.ts          # Shared Graph token acquisition (cached)
    /orchestrator
      index.ts              # Main orchestration logic
      types.ts              # Shared TypeScript interfaces
    /templates
      folderStructure.json  # Template folder/subfolder definitions
    /utils
      retry.ts              # Exponential backoff retry utility
      logger.ts             # Structured logger
    index.ts                # Azure Function entry point
  /tests
    services.test.ts        # Unit tests for all service modules
    orchestrator.test.ts    # Orchestrator unit tests
  /scripts
    test-run.ts             # Integration test / dry-run script
  .env.example
  package.json
  tsconfig.json
  README.md
```

---

## Prerequisites

- Node.js 20+
- Azure CLI (`az`) installed and logged in
- Azure Functions Core Tools v4: `npm install -g azure-functions-core-tools@4`
- An Azure subscription with permissions to create Function Apps, Bot Services, and App Registrations

---

## Step-by-Step Azure Function Deployment

### 1. Clone and install dependencies

```bash
git clone <repo-url> new-project-provisioner
cd new-project-provisioner
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in all required values (see "Environment Variables" section)
```

### 3. Build TypeScript

```bash
npm run build
```

### 4. Create Azure resources

```bash
# Set your preferred region and names
LOCATION="eastus"
RG="rg-project-provisioner"
STORAGE="stprojprovisioner"      # must be globally unique, lowercase, 3-24 chars
FUNCAPP="func-project-provisioner"  # must be globally unique

# Resource group
az group create --name $RG --location $LOCATION

# Storage account (required by Azure Functions)
az storage account create \
  --name $STORAGE \
  --location $LOCATION \
  --resource-group $RG \
  --sku Standard_LRS

# Function App (Node 20, Consumption plan)
az functionapp create \
  --resource-group $RG \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name $FUNCAPP \
  --storage-account $STORAGE \
  --os-type Linux
```

### 5. Deploy the function code

```bash
func azure functionapp publish $FUNCAPP --build remote
```

### 6. Set Application Settings (environment variables)

```bash
# Replace placeholder values with your actual credentials
az functionapp config appsettings set \
  --name $FUNCAPP \
  --resource-group $RG \
  --settings \
    MICROSOFT_APP_ID="<your-app-id>" \
    MICROSOFT_APP_PASSWORD="<your-app-password>" \
    AZURE_TENANT_ID="<your-tenant-id>" \
    AZURE_CLIENT_ID="<your-client-id>" \
    AZURE_CLIENT_SECRET="<your-client-secret>" \
    DROPBOX_ACCESS_TOKEN="<token>" \
    DROPBOX_TEMPLATE_PATH="/_TEMPLATES/New Project Template" \
    FRAMEIO_TOKEN="<token>" \
    FRAMEIO_TEAM_ID="<team-id>" \
    NOTION_TOKEN="<token>" \
    NOTION_PROJECTS_DB_ID="<db-id>" \
    CANVA_ACCESS_TOKEN="<token>" \
    CANVA_ROOT_FOLDER_ID="<folder-id>" \
    CLOCKIFY_API_KEY="<key>" \
    CLOCKIFY_WORKSPACE_ID="<workspace-id>" \
    FIGMA_TOKEN="<token>" \
    FIGMA_TEMPLATE_FILE_KEY="<file-key>" \
    FIGMA_TEAM_ID="<team-id>"
```

### 7. Get your function endpoint URL

```bash
az functionapp function show \
  --name $FUNCAPP \
  --resource-group $RG \
  --function-name messages \
  --query "invokeUrlTemplate" -o tsv
# Output: https://<funcapp>.azurewebsites.net/api/messages
```

---

## Azure Bot Registration Walkthrough

### 1. Create the App Registration

```bash
# Create Azure AD app registration
az ad app create \
  --display-name "Project Provisioner Bot" \
  --sign-in-audience "AzureADMyOrg"

# Note the appId from the output — this is MICROSOFT_APP_ID
```

### 2. Create a client secret

```bash
APP_ID="<appId-from-above>"

az ad app credential reset \
  --id $APP_ID \
  --append \
  --display-name "bot-secret"

# Note the `password` field — this is MICROSOFT_APP_PASSWORD
```

### 3. Create the Bot Service

In the Azure portal:
1. Go to **Create a resource** → search for **Azure Bot**
2. Fill in:
   - **Bot handle**: `project-provisioner-bot`
   - **Subscription / Resource Group**: match your function app
   - **Microsoft App ID**: paste the App ID from step 1
   - **App type**: Single Tenant
3. Click **Create**

Or via CLI:

```bash
az bot create \
  --resource-group $RG \
  --name "project-provisioner-bot" \
  --kind registration \
  --appid $APP_ID \
  --endpoint "https://<funcapp>.azurewebsites.net/api/messages"
```

### 4. Enable the Microsoft Teams channel

In the Azure portal → Bot Service → **Channels** → click **Microsoft Teams** → Save.

### 5. Update the Messaging Endpoint

In the Azure portal → Bot Service → **Configuration**:
- Set **Messaging endpoint** to `https://<funcapp>.azurewebsites.net/api/messages`

### 6. Grant Graph API permissions

In the Azure portal → **App Registrations** → your app → **API permissions**:

1. Click **Add a permission** → **Microsoft Graph** → **Application permissions**
2. Add: `Chat.Create`, `ChatMember.ReadWrite`, `User.Read.All`
3. Click **Grant admin consent**

### 7. Install the bot in Teams

1. In the Azure portal → Bot Service → **Channels** → Teams → **Open in Teams**
2. Or package as a Teams app manifest and distribute via Teams Admin Center

---

## Required API Permissions Per Service

| Service    | Auth Method              | Required Permissions / Scopes                          |
|------------|--------------------------|--------------------------------------------------------|
| Dropbox    | OAuth2 access token      | `files.content.write`, `sharing.write`                 |
| Frame.io   | API token (bearer)       | Team admin access; project create permissions          |
| Canva      | OAuth2 access token      | `folder:write`                                         |
| OneDrive   | Graph app credentials    | `Files.ReadWrite.All`                                  |
| Clockify   | API key header           | Workspace admin or project create role                 |
| Figma      | Personal access token    | File read + write on the team                          |
| Notion     | Integration token        | Read/write access to the projects database             |
| Teams      | Graph app credentials    | `Chat.Create`, `ChatMember.ReadWrite`, `User.Read.All` |

---

## How to Update the Folder Template Structure

All folder/subfolder definitions live in:
```
src/templates/folderStructure.json
```

### Frame.io subfolders

Edit the `frameio` array:
```json
{
  "frameio": ["01_FOOTAGE", "02_AUDIO", "03_GRAPHICS", "04_EXPORTS", "05_REFS", "06_DELIVERY"]
}
```
Each string becomes a top-level folder inside the Frame.io project.

### OneDrive subfolder tree

Edit the `onedrive` array. Each item may have a `children` array:
```json
{
  "onedrive": [
    { "name": "01_PRE-PRODUCTION", "children": ["Brief", "Scripts"] },
    { "name": "02_PRODUCTION" }
  ]
}
```
Children create one level of nesting under the parent folder.

### Clockify default tasks

Edit the `clockifyTasks` array:
```json
{
  "clockifyTasks": ["Pre-Production", "Animation", "Final Delivery"]
}
```
Each string becomes a time-tracking task inside the Clockify project.

After editing, rebuild and redeploy:
```bash
npm run build && func azure functionapp publish <funcapp-name> --build remote
```

---

## How to Add a New Service to the Orchestrator

1. **Create the service file** at `src/services/myservice.ts`:

```typescript
// src/services/myservice.ts
import axios from 'axios';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';
import { ServiceResult } from '../orchestrator/types';

export async function provisionMyService(
  projectName: string,
  clientName: string,
  dryRun = false
): Promise<ServiceResult> {
  try {
    if (dryRun) {
      return { service: 'MyService', success: true, url: 'https://example.com/dry-run' };
    }

    const response = await withRetry(() =>
      axios.post('https://api.example.com/resource', { name: projectName }, {
        headers: { Authorization: `Bearer ${process.env.MYSERVICE_TOKEN}` }
      })
    );

    const url = response.data.url as string;
    logger.serviceResult('MyService', true, url);
    return { service: 'MyService', success: true, url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.serviceResult('MyService', false, message);
    return { service: 'MyService', success: false, error: message };
  }
}
```

2. **Add the service name to the `ServiceName` union** in `src/orchestrator/types.ts`:

```typescript
export type ServiceName =
  | 'Dropbox' | 'FrameIo' | 'Canva' | 'OneDrive'
  | 'Clockify' | 'FigJam' | 'Notion' | 'Teams'
  | 'MyService'; // ← add here
```

3. **Add a field to `ProvisioningResults`** in `types.ts`:

```typescript
export interface ProvisioningResults {
  // ... existing fields ...
  myservice?: ServiceResult;
}
```

4. **Import and call in `src/orchestrator/index.ts`**. For parallel execution, add to the `Promise.allSettled` block:

```typescript
import { provisionMyService } from '../services/myservice';

// In Phase 1:
const [
  dropboxResult, frameioResult, canvaResult, onedriveResult,
  clockifyResult, figmaResult,
  myserviceResult,   // ← add here
] = await Promise.allSettled([
  provisionDropbox(projectName, clientName, dryRun),
  provisionFrameIo(projectName, clientName, dryRun),
  // ... others ...
  provisionMyService(projectName, clientName, dryRun),  // ← add here
]);

results.myservice = extractResult(myserviceResult, 'MyService'); // ← add here
```

5. **Update the summary card** in `src/bot/summaryCard.ts` to include the new link.

6. **Add the URL property** to `NotionLinkProperties` in `types.ts` and update `patchNotionPageWithLinks` in `src/services/notion.ts` to include it.

7. **Write unit tests** in `tests/services.test.ts` following the existing pattern.

8. **Add environment variable(s)** to `.env.example` and to Azure App Settings.

---

## Running Tests

```bash
# Unit tests (mocked APIs)
npm test

# Unit tests with coverage report
npm run test:coverage

# Integration test — dry run (no API calls made)
npx ts-node scripts/test-run.ts --dry-run

# Integration test — live run against real APIs
# (set TEST_PM_EMAIL and TEST_TEAM_EMAILS in .env first)
npx ts-node scripts/test-run.ts

# Integration test with a custom project name
npx ts-node scripts/test-run.ts --project "My Q4 Sizzle Reel"
```

---

## Local Development

```bash
# Copy and configure env vars
cp .env.example .env

# Start the function locally
npm run build
func start

# The bot endpoint will be available at:
# http://localhost:7071/api/messages

# Use ngrok to expose locally for Teams testing:
ngrok http 7071
# Then update your bot's Messaging Endpoint in Azure portal to:
# https://<ngrok-id>.ngrok.io/api/messages
```

---

## Environment Variables Reference

| Variable                        | Description                                      |
|---------------------------------|--------------------------------------------------|
| `MICROSOFT_APP_ID`              | Azure AD App Registration ID for the bot         |
| `MICROSOFT_APP_PASSWORD`        | Azure AD App Registration secret                 |
| `AZURE_TENANT_ID`               | Azure AD tenant ID                               |
| `AZURE_CLIENT_ID`               | Service principal client ID (Graph API)          |
| `AZURE_CLIENT_SECRET`           | Service principal client secret                  |
| `ONEDRIVE_DRIVE_ID`             | SharePoint/OneDrive drive ID                     |
| `ONEDRIVE_ROOT_FOLDER_ID`       | Item ID of the root projects folder in OneDrive  |
| `DROPBOX_ACCESS_TOKEN`          | Dropbox OAuth2 long-lived access token           |
| `DROPBOX_TEMPLATE_PATH`         | Path to master template folder in Dropbox        |
| `FRAMEIO_TOKEN`                 | Frame.io API token                               |
| `FRAMEIO_TEAM_ID`               | Frame.io team ID to create projects under        |
| `NOTION_TOKEN`                  | Notion integration token                         |
| `NOTION_PROJECTS_DB_ID`         | Notion database ID for the projects database     |
| `CANVA_ACCESS_TOKEN`            | Canva Connect OAuth2 access token                |
| `CANVA_ROOT_FOLDER_ID`          | Parent folder ID in Canva                        |
| `CLOCKIFY_API_KEY`              | Clockify API key                                 |
| `CLOCKIFY_WORKSPACE_ID`         | Clockify workspace ID                            |
| `FIGMA_TOKEN`                   | Figma personal access token                      |
| `FIGMA_TEMPLATE_FILE_KEY`       | Key of the FigJam template file to duplicate     |
| `FIGMA_TEAM_ID`                 | Figma team ID (for project organization)         |
