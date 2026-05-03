/**
 * Builds the Block Kit modal for the /kit newproject intake form.
 * private_metadata carries channel_id so the interaction handler
 * knows where to post the summary.
 */
export function buildNewProjectModal(channelId: string) {
  return {
    type: 'modal' as const,
    callback_id: 'kit_provision_project',
    private_metadata: JSON.stringify({ channel_id: channelId }),
    title: { type: 'plain_text' as const, text: 'New Project' },
    submit: { type: 'plain_text' as const, text: 'Create Project' },
    close: { type: 'plain_text' as const, text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'project_number',
        label: { type: 'plain_text', text: 'Project Number' },
        element: { type: 'plain_text_input', action_id: 'val', placeholder: { type: 'plain_text', text: 'e.g. 2601' } },
      },
      {
        type: 'input',
        block_id: 'project_name',
        label: { type: 'plain_text', text: 'Project Name' },
        element: { type: 'plain_text_input', action_id: 'val', placeholder: { type: 'plain_text', text: 'e.g. Summer Campaign' } },
      },
      {
        type: 'input',
        block_id: 'client_name',
        label: { type: 'plain_text', text: 'Client Name' },
        element: { type: 'plain_text_input', action_id: 'val', placeholder: { type: 'plain_text', text: 'e.g. Nike' } },
      },
      {
        type: 'input',
        block_id: 'project_type',
        label: { type: 'plain_text', text: 'Project Type' },
        element: {
          type: 'static_select',
          action_id: 'val',
          placeholder: { type: 'plain_text', text: 'Select type' },
          options: [
            { text: { type: 'plain_text', text: 'Brand Video' }, value: 'Brand Video' },
            { text: { type: 'plain_text', text: 'Motion Graphics' }, value: 'Motion Graphics' },
            { text: { type: 'plain_text', text: 'Social Campaign' }, value: 'Social Campaign' },
            { text: { type: 'plain_text', text: 'Explainer' }, value: 'Explainer' },
            { text: { type: 'plain_text', text: 'Broadcast' }, value: 'Broadcast' },
            { text: { type: 'plain_text', text: 'Other' }, value: 'Other' },
          ],
        },
      },
      {
        type: 'input',
        block_id: 'project_manager',
        label: { type: 'plain_text', text: 'Project Manager' },
        element: { type: 'users_select', action_id: 'val', placeholder: { type: 'plain_text', text: 'Select PM' } },
      },
      {
        type: 'input',
        block_id: 'team_members',
        label: { type: 'plain_text', text: 'Team Members' },
        optional: true,
        element: { type: 'multi_users_select', action_id: 'val', placeholder: { type: 'plain_text', text: 'Select team' } },
      },
      {
        type: 'input',
        block_id: 'start_date',
        optional: true,
        label: { type: 'plain_text', text: 'Start Date' },
        element: { type: 'datepicker', action_id: 'val' },
      },
      {
        type: 'input',
        block_id: 'deadline',
        optional: true,
        label: { type: 'plain_text', text: 'Deadline' },
        element: { type: 'datepicker', action_id: 'val' },
      },
      {
        type: 'input',
        block_id: 'description',
        optional: true,
        label: { type: 'plain_text', text: 'Brief Description' },
        element: { type: 'plain_text_input', action_id: 'val', multiline: true, max_length: 1000 },
      },
      { type: 'divider' },
      {
        type: 'input',
        block_id: 'services',
        label: { type: 'plain_text', text: 'Services to Provision' },
        element: {
          type: 'checkboxes',
          action_id: 'val',
          initial_options: [
            { text: { type: 'plain_text', text: 'Dropbox' }, value: 'dropbox' },
            { text: { type: 'plain_text', text: 'Frame.io' }, value: 'frameio' },
            { text: { type: 'plain_text', text: 'Canva' }, value: 'canva' },
            { text: { type: 'plain_text', text: 'OneDrive' }, value: 'onedrive' },
            { text: { type: 'plain_text', text: 'Clockify' }, value: 'clockify' },
            { text: { type: 'plain_text', text: 'FigJam' }, value: 'figma' },
            { text: { type: 'plain_text', text: 'Slack Channel' }, value: 'slack' },
          ],
          options: [
            { text: { type: 'plain_text', text: 'Dropbox' }, value: 'dropbox' },
            { text: { type: 'plain_text', text: 'Frame.io' }, value: 'frameio' },
            { text: { type: 'plain_text', text: 'Canva' }, value: 'canva' },
            { text: { type: 'plain_text', text: 'OneDrive' }, value: 'onedrive' },
            { text: { type: 'plain_text', text: 'Clockify' }, value: 'clockify' },
            { text: { type: 'plain_text', text: 'FigJam' }, value: 'figma' },
            { text: { type: 'plain_text', text: 'Slack Channel' }, value: 'slack' },
          ],
        },
      },
    ],
  }
}
