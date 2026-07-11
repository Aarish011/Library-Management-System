import { useEffect, useState } from 'react';
import { confirmDeskPayment, getPayments } from '../api/paymentApi';
import DataTable from '../components/common/DataTable';

export default function PaymentsPage() {
  const [rows, setRows] = useState([]);

  const load = () => getPayments().then((res) => setRows(res.data || []));

  useEffect(() => {
    load();
  }, []);

  return (
    <section className='page'>
      <h1>Payments</h1>
      <DataTable
        columns={[
          {
            key: 'user',
            label: 'Student',
            render: (row) => row.user?.name || '-',
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (row) => `Rs. ${row.amount}`,
          },
          { key: 'paymentMethod', label: 'Method' },
          {
            key: 'status',
            label: 'Status',
            render: (row) => formatPaymentStatus(row),
          },
          {
            key: 'referenceId',
            label: 'Reference',
            render: (row) => row.referenceId || '-',
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) =>
              canConfirmDeskPayment(row) ? (
                <button
                  type='button'
                  onClick={async () => {
                    await confirmDeskPayment(row._id);
                    load();
                  }}
                >
                  Confirm Desk
                </button>
              ) : (
                '-'
              ),
          },
        ]}
        rows={rows}
      />
    </section>
  );
}

function canConfirmDeskPayment(payment) {
  if (payment.paymentMethod !== 'pay_on_desk' || payment.status !== 'pending') {
    return false;
  }

  if (!payment.reservation) return true;
  if (payment.reservation.status === 'expired') return false;
  if (
    payment.reservation.status === 'active' &&
    new Date(payment.reservation.reservedUntil).getTime() <= Date.now()
  ) {
    return false;
  }

  return true;
}

function formatPaymentStatus(payment) {
  if (payment.status === 'failed') {
    return payment.failureReason || 'Failed to pay';
  }

  if (
    payment.status === 'pending' &&
    payment.reservation?.status === 'active' &&
    new Date(payment.reservation.reservedUntil).getTime() <= Date.now()
  ) {
    return 'Failed to pay';
  }

  if (payment.status === 'pending') return 'Pending payment';
  if (payment.status === 'paid') return 'Paid';
  return payment.status || '-';
}
