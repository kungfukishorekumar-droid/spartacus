import { redirect } from 'next/navigation';
import { isAuthenticated } from './auth';

/** Call at the top of every admin page. Sends signed-out visitors to login. */
export async function guardAdminPage(): Promise<void> {
  if (!(await isAuthenticated())) redirect('/admin/login');
}
