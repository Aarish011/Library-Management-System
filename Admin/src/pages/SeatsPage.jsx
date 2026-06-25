import { useEffect, useState } from 'react';
import { getSeats } from '../api/seatApi';
import DataTable from '../components/common/DataTable';
export default function SeatsPage() { const [rows, setRows] = useState([]); useEffect(() => { getSeats().then((res) => setRows(res.data || [])); }, []); return <section className='page'><h1>Seats</h1><DataTable columns={[{ key: 'seatNumber', label: 'Seat' }, { key: 'zone', label: 'Zone' }, { key: 'status', label: 'Status' }, { key: 'heldBy', label: 'Assigned To', render: (r) => r.heldBy?.name || '-' }]} rows={rows} /></section>; }