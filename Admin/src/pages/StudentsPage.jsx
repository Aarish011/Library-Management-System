import { useEffect, useState } from 'react';
import {
  deleteStudent,
  getStudents,
  updateStudent,
  uploadStudentAvatar,
} from '../api/studentApi';
import DataTable from '../components/common/DataTable';

const preparationOptions = ['UPSC', 'JEE', 'GATE', 'NEET', 'CAT', 'Banking', 'SSC', 'Other'];
const genderOptions = ['Male', 'Female', 'Other'];

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [preparation, setPreparation] = useState('');
  const [status, setStatus] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    gender: '',
    preparation: '',
    isActive: true,
  });
  const [updatingId, setUpdatingId] = useState('');
  const [archivingId, setArchivingId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
      if (selectedStudent) {
        const refreshed = (res.data || []).find(
          (student) => student._id === selectedStudent._id
        );
        if (refreshed) setSelectedStudent(refreshed);
      }
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

  const openEditor = (student) => {
    setError('');
    setSuccess('');
    setSelectedStudent(student);
    setEditForm({
      name: student.name || '',
      phone: student.phone || '',
      gender: student.gender || '',
      preparation: student.preparation || '',
      isActive: student.isActive !== false,
    });
  };

  const saveStudentDetails = async (event) => {
    event.preventDefault();
    if (!selectedStudent) return;

    try {
      setSavingEdit(true);
      setError('');
      setSuccess('');
      const response = await updateStudent(selectedStudent._id, editForm);
      setSelectedStudent(response.data);
      await load();
      setSuccess(`${editForm.name || 'Student'} details updated successfully.`);
    } catch (err) {
      setError(err.message || 'Failed to update student details');
    } finally {
      setSavingEdit(false);
    }
  };

  const changeStudentPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedStudent) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file for the student photo.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be smaller than 5 MB.');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError('');
      setSuccess('');
      const response = await uploadStudentAvatar(selectedStudent._id, file);
      setSelectedStudent(response.data);
      await load();
      setSuccess('Student profile photo updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to upload student photo');
    } finally {
      setUploadingPhoto(false);
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
      {selectedStudent && (
        <section className='panel student-editor'>
          <div className='panel-heading'>
            <div>
              <h2>Edit student profile</h2>
              <p>Only admins can change student personal information.</p>
            </div>
            <button
              type='button'
              className='secondary-button'
              onClick={() => setSelectedStudent(null)}
            >
              Close
            </button>
          </div>

          <div className='student-editor-layout'>
            <div className='student-photo-card'>
              <StudentAvatar student={selectedStudent} large />
              <strong>{selectedStudent.name}</strong>
              <span>{selectedStudent.email}</span>
              <label className='secondary-button photo-upload-button'>
                {uploadingPhoto ? 'Uploading...' : 'Change photo'}
                <input
                  type='file'
                  accept='image/*'
                  disabled={uploadingPhoto}
                  onChange={changeStudentPhoto}
                />
              </label>
            </div>

            <form className='student-edit-form' onSubmit={saveStudentDetails}>
              <label>
                Full name
                <input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm({ ...editForm, name: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Phone
                <input
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm({ ...editForm, phone: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Gender
                <select
                  value={editForm.gender}
                  onChange={(event) =>
                    setEditForm({ ...editForm, gender: event.target.value })
                  }
                  required
                >
                  <option value=''>Select gender</option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Preparation
                <select
                  value={editForm.preparation}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      preparation: event.target.value,
                    })
                  }
                  required
                >
                  <option value=''>Select preparation</option>
                  {preparationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Account status
                <select
                  value={editForm.isActive ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      isActive: event.target.value === 'active',
                    })
                  }
                >
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
                </select>
              </label>
              <div className='student-editor-actions'>
                <button type='submit' disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
      <DataTable
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (student) => (
              <div className='student-identity'>
                <StudentAvatar student={student} />
                <div>
                  <strong>{student.name}</strong>
                  <span>{student.gender || 'Gender not set'}</span>
                </div>
              </div>
            ),
          },
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
                  onClick={() => openEditor(student)}
                  disabled={
                    updatingId === student._id ||
                    archivingId === student._id
                  }
                >
                  Edit
                </button>
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

function StudentAvatar({ student, large = false }) {
  const className = large ? 'alumni-avatar large' : 'alumni-avatar';

  if (student.profilePicture) {
    return (
      <img
        src={student.profilePicture}
        alt={student.name || 'Student'}
        className={className}
      />
    );
  }

  return (
    <span className={`${className} initials`}>
      {(student.name || student.email || 'S').charAt(0).toUpperCase()}
    </span>
  );
}
