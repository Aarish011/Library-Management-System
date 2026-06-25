import { useEffect, useState } from 'react';
import { confirmDeskPayment, getPayments } from '../api/paymentApi';
import DataTable from '../components/common/DataTable';

export default function PaymentsPage() {
  const [rows, setRows] = useState([]);
  const load = () => getPayments().then((res) => setRows(res.data || []));
  useEffect(() => { load(); }, []);
  return <section className='page'><h1>Payments</h1><DataTable columns={[{ key: 'user', label: 'Student', render: (r) => r.user?.name || '-' }, { key: 'amount', label: 'Amount', render: (r) => `Rs. ${r.amount}` }, { key: 'paymentMethod', label: 'Method' }, { key: 'status', label: 'Status' }, { key: 'referenceId', label: 'Reference', render: (r) => r.referenceId || '-' }, { key: 'actions', label: 'Actions', render: (r) => r.paymentMethod === 'pay_on_desk' && r.status === 'pending' ? <button onClick={async () => { await confirmDeskPayment(r._id); load(); }}>Confirm Desk</button> : '-' }]} rows={rows} /></section>;
}