'use client';

import { PaymentStatus } from '@prisma/client';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string | null;
  originalAmount: number | null;
  discountAmount: number | null;
  promotionCode: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface PaymentHistoryTableProps {
  payments: Payment[];
}

export default function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  if (payments.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
        No payment history yet
      </p>
    );
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'SUCCEEDED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Paid
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Failed
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            Pending
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {formatDate(payment.paidAt || payment.createdAt)}
              </td>
              <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                {payment.description || 'Subscription payment'}
                {payment.promotionCode && (
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                    ({payment.promotionCode})
                  </span>
                )}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm">
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatAmount(payment.amount, payment.currency)}
                </span>
                {payment.discountAmount && payment.discountAmount > 0 && (
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                    -{formatAmount(payment.discountAmount, payment.currency)}
                  </span>
                )}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                {getStatusBadge(payment.status)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
