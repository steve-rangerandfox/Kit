'use server'

export async function approveAction(actionId: string) {
  // TODO: Connect to Supabase to update action status
  console.log(`Approved action: ${actionId}`)
  return { success: true }
}

export async function dismissAction(actionId: string) {
  // TODO: Connect to Supabase to update action status
  console.log(`Dismissed action: ${actionId}`)
  return { success: true }
}
