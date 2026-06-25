import { useEffect, useState } from 'react';
import { getStudents, updateStudent } from '../api/studentApi';
import DataTable from '../components/common/DataTable';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await getStudents(query);
      setStudents(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load students');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleStudentStatus = async (student) => {
    try {
      setUpdatingId(student._id);
      setError('');
      await updateStudent(student._id, { isActive: !student.isActive });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to update student status');
    } finally {
      setUpdatingId('');
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
        <button onClick={load}>Search</button>
      </div>
      {error && <p className='error'>{error}</p>}
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
              <button
                type='button'
                disabled={updatingId === student._id}
                onClick={() => toggleStudentStatus(student)}
              >
                {updatingId === student._id
                  ? 'Updating...'
                  : student.isActive
                    ? 'Deactivate'
                    : 'Activate'}
              </button>
            ),
          },
        ]}
        rows={students}
      />
    </section>
  );
}
