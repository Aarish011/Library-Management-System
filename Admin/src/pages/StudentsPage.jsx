import { useEffect, useState } from 'react';
import {
  deleteStudent,
  getStudents,
  updateStudent,
} from '../api/studentApi';
import DataTable from '../components/common/DataTable';

const preparationOptions = ['UPSC', 'JEE', 'GATE', 'NEET', 'CAT', 'Banking', 'SSC', 'Other'];

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [preparation, setPreparation] = useState('');
  const [status, setStatus] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [archivingId, setArchivingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      setError('');
      setSuccess('');
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (preparation) params.set('preparation', preparation);
      if (status) params.set('status', status);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await getStudents(query);
      setStudents(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load students');
    }
  };

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (preparation) params.set('preparation', preparation);
    if (status) params.set('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';

    getStudents(query)
      .then((response) => {
        if (active) setStudents(response.data || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load students');
      });
    return () => {
      active = false;
    };
  }, [preparation, status]);

  const clearFilters = async () => {
    setSearch('');
    setPreparation('');
    setStatus('');
    try {
      setError('');
      setSuccess('');
      const res = await getStudents();
      setStudents(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load students');
    }
  };

  const toggleStudentStatus = async (student) => {
    try {
      setUpdatingId(student._id);
      setError('');
      setSuccess('');
      await updateStudent(student._id, { isActive: !student.isActive });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to update student status');
    } finally {
      setUpdatingId('');
    }
  };

  const archiveStudent = async (student) => {
    const confirmed = window.confirm(
      `Move ${student.name} to Alumni? Their login and active subscription will be disabled, and their seat will be released.`
    );
    if (!confirmed) return;

    try {
      setArchivingId(student._id);
      setError('');
      setSuccess('');
      const response = await deleteStudent(student._id);
      await load();
      setSuccess(
        response.message || `${student.name} was moved to Alumni successfully.`
      );
    } catch (err) {
      setError(err.message || 'Failed to move student to alumni');
    } finally {
      setArchivingId('');
    }
  };

  return (
    <section className='page'>
      <h1>Students</h1>
      <div className='toolbar'>
        <input
          placeholder='Search students'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label='Filter by preparation'
          value={preparation}
          onChange={(event) => setPreparation(event.target.value)}
        >
          <option value=''>All preparations</option>
          {preparationOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          aria-label='Filter by status'
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value=''>All students</option>
          <option value='active'>Active</option>
          <option value='inactive'>Inactive</option>
        </select>
        <button onClick={load}>Search</button>
        <button type='button' className='secondary-button' onClick={clearFilters}>
          Reset
        </button>
      </div>
      {error && <p className='error'>{error}</p>}
      {success && <p className='success archive-success'>{success}</p>}
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'preparation', label: 'Preparation' },
          {
            key: 'isActive',
            label: 'Status',
            render: (student) => (student.isActive ? 'Active' : 'Inactive'),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (student) => (
              <div className='table-actions'>
                <button
                  type='button'
                  className='secondary-button'
                  disabled={
                    updatingId === student._id ||
                    archivingId === student._id
                  }
                  onClick={() => toggleStudentStatus(student)}
                >
                  {updatingId === student._id
                    ? 'Updating...'
                    : student.isActive
                      ? 'Deactivate'
                      : 'Activate'}
                </button>
                <button
                  type='button'
                  className='danger-button'
                  disabled={
                    archivingId === student._id ||
                    updatingId === student._id
                  }
                  onClick={() => archiveStudent(student)}
                >
                  {archivingId === student._id
                    ? 'Moving...'
                    : 'Move to Alumni'}
                </button>
              </div>
            ),
          },
        ]}
        rows={students}
      />
    </section>
  );
}
