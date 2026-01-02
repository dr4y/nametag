import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PasswordChangeForm from '@/components/PasswordChangeForm';

export default async function SecuritySettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Password
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Update your password to keep your account secure.
      </p>
      <PasswordChangeForm userId={session.user.id} />
    </div>
  );
}
