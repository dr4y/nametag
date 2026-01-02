'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubscriptionTier } from '@prisma/client';
import { toast } from 'sonner';

interface BillingActionsProps {
  tier: SubscriptionTier;
  hasStripeSubscription: boolean;
  cancelAtPeriodEnd: boolean;
}

export default function BillingActions({
  tier,
  hasStripeSubscription,
  cancelAtPeriodEnd,
}: BillingActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleOpenPortal = async () => {
    setLoading('portal');
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to open billing portal');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async (immediately: boolean) => {
    setLoading('cancel');
    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCancelConfirm(false);
        toast.success(
          immediately
            ? 'Your subscription has been cancelled'
            : 'Your subscription will be cancelled at the end of the billing period'
        );
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to cancel subscription');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  if (tier === 'FREE') {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {hasStripeSubscription && (
          <button
            onClick={handleOpenPortal}
            disabled={loading !== null}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading === 'portal' ? 'Opening...' : 'Manage Billing'}
          </button>
        )}

        {hasStripeSubscription && !cancelAtPeriodEnd && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            disabled={loading !== null}
            className="px-4 py-2 text-red-600 dark:text-red-400 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel Subscription
          </button>
        )}

        {cancelAtPeriodEnd && (
          <span className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 font-medium rounded-lg">
            Cancels at end of billing period
          </span>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Cancel Subscription?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to cancel your subscription? You can choose to:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-medium">Cancel at period end:</span>
                Keep access until your current billing period ends
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium">Cancel immediately:</span>
                Lose access right away (no refund)
              </li>
            </ul>
            <div className="flex flex-col gap-2 pt-4">
              <button
                onClick={() => handleCancel(false)}
                disabled={loading === 'cancel'}
                className="w-full py-2 px-4 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
              >
                {loading === 'cancel' ? 'Processing...' : 'Cancel at Period End'}
              </button>
              <button
                onClick={() => handleCancel(true)}
                disabled={loading === 'cancel'}
                className="w-full py-2 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Cancel Immediately
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={loading === 'cancel'}
                className="w-full py-2 px-4 text-gray-600 dark:text-gray-400 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Keep Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
