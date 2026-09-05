/** Shared shape for admin server-action results. Kept out of the 'use server'
 *  module because those files may only export async functions. */
export interface ActionState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  errors?: string[];
  warnings?: string[];
  postId?: string;
}

export const initialActionState: ActionState = { status: 'idle' };
