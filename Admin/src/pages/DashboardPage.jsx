import { useEffect, useState } from 'react';
import { getDashboard } from '../api/dashboardApi';
import StatCard from '../components/common/StatCard';
import DataTable from '../components/common/DataTable';
import Loader from '../components/common/Loader';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard().then((res) => setData(res.data)).catch((err) => setError(err.message));
  }, []);

  if (!data && !error) return <Loader />;
  const stats = data?.stats || {};

  return (
    <section className='page'>
      <h1>Dashboard</h1>
      {error && <div className='error'>{error}</div>}
      <div className='stats-grid'>
        <StatCard label='Total Students' value={stats.totalStudents || 0} />
        <StatCard label='Active Students' value={stats.activeStudents || 0} />
        <StatCard label='Available Seats' value={stats.availableSeats || 0} />
        <StatCard label='Occupied Seats' value={stats.occupiedSeats || 0} />
        <StatCard label='Monthly Revenue' value={`Rs. ${(stats.monthlyRevenue || 0).toLocaleString('en-IN')}`} />
        <StatCard label='Renewals Due' value={stats.renewalsDue || 0} />
      </div>
      <div className='panel-grid'>
        <div className='panel'><h2>Seat Occupancy</h2><div className='big-number'>{stats.occupancyPercent || 0}%</div></div>
        <div className='panel'><h2>Plan Distribution</h2>{(data?.planDistribution || []).map((p) => <p key={p._id}>{p._id}: {p.count}</p>)}</div>
      </div>
      <div className='panel'>
        <h2>Recent Payments</h2>
        <DataTable columns={[{ key: 'user', label: 'Student', render: (r) => r.user?.name || '-' }, { key: 'amount', label: 'Amount', render: (r) => `Rs. ${r.amount}` }, { key: 'status', label: 'Status' }]} rows={data?.recentPayments || []} />
      </div>
    </section>
  );
}