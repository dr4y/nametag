import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/ProfileForm';

export default async function ProfileSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Profile
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Manage your personal information and how others see you.
      </p>
      <ProfileForm
        userId={session.user.id}
        currentName={session.user.name || ''}
        currentSurname={session.user.surname || ''}
        currentNickname={session.user.nickname || ''}
        currentEmail={session.user.email || ''}
      />
    </div>
  );
}
