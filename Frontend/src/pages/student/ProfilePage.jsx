// ProfilePage.jsx
// Renders every field from the User schema:
// name, email, phone, gender, preparation, role, isActive, profilePicture,
// lastLogin, createdAt (member since). Password is never fetched (select:
// false on the backend) — it gets its own separate change-password form.

import { useEffect, useState, useCallback } from 'react';
import { fetchProfile, updateProfile, changePassword, uploadProfilePicture } from '../../api/profileApi';
import { useAuth } from '../../hooks/useAuth';

const PREPARATION_OPTIONS = [
  'UPSC',
  'JEE',
  'GATE',
  'NEET',
  'CAT',
  'Banking',
  'SSC',
  'Other',
];
export default function ProfilePage() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let active = true;
    fetchProfile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setForm(toFormState(data));
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err.message || 'Could not load your profile from the server.');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleFieldChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleCancelEdit = () => {
    setForm(toFormState(profile));
    setIsEditing(false);
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Profile picture must be smaller than 5 MB.', 'error');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const updated = await uploadProfilePicture(file);
      setProfile(updated);
      setForm(toFormState(updated));
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      showToast('Profile picture updated successfully.');
    } catch (err) {
      showToast(err.message || 'Could not upload profile picture.', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const {
      emailDisplay: _emailDisplay,
      gender: _gender,
      ...payload
    } = form;
    try {
      const updated = await updateProfile(payload);
      setProfile(updated);
      setForm(toFormState(updated));
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      showToast('Profile updated successfully.');
      setIsEditing(false);
    } catch (err) {
      showToast(err.message || 'Could not update profile. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

  if (!profile || !form) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center px-4'>
        <div className='max-w-md w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center'>
          <h1 className='text-lg font-semibold text-slate-900'>Could not load profile</h1>
          <p className='mt-2 text-sm text-amber-800'>
            {loadError || 'Please try refreshing the page.'}
          </p>
          <button
            type='button'
            onClick={() => window.location.reload()}
            className='mt-4 px-4 py-2 rounded-lg bg-[#11182B] text-white text-sm font-medium hover:bg-[#1B2540]'
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className='min-h-screen bg-slate-50 pb-12'
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <link
        href='https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Inter:wght@400;500;600&display=swap'
        rel='stylesheet'
      />

      <header className='bg-[#11182B]'>
        <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20'>
          <h1
            className='text-[24px] text-white'
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
          >
            My profile
          </h1>
          <p className='text-[13.5px] text-[#9AA4C2] mt-1'>
            Manage your personal details and account settings.
          </p>
        </div>
      </header>

      <main className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 space-y-6'>
        {loadError && (
          <div className='px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[13px]'>
            {loadError}
          </div>
        )}

        <ProfileHeaderCard
          profile={profile}
          isEditing={isEditing}
          isUploadingAvatar={isUploadingAvatar}
          onAvatarUpload={handleAvatarUpload}
          onEdit={() => setIsEditing(true)}
        />

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2 space-y-6'>
            <PersonalDetailsCard
              form={form}
              isEditing={isEditing}
              isSaving={isSaving}
              onChange={handleFieldChange}
              onSave={handleSave}
              onCancel={handleCancelEdit}
            />
            <ChangePasswordCard showToast={showToast} />
          </div>

          <AccountInfoCard profile={profile} />
        </div>
      </main>

      <Toast toast={toast} />
    </div>
  );
}

function toFormState(profile) {
  return {
    name: profile.name ?? '',
    emailDisplay: profile.email ?? '',
    phone: profile.phone ?? '',
    gender: profile.gender ?? '',
    preparation: profile.preparation ?? '',
  };
}

// ---------- Header card: big avatar + identity ----------

function ProfileHeaderCard({ profile, isEditing, isUploadingAvatar, onAvatarUpload, onEdit }) {
  return (
    <div className='bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6'>
      <Avatar
        profilePicture={profile.profilePicture}
        name={profile.name}
        isUploading={isUploadingAvatar}
        onUpload={onAvatarUpload}
      />

      <div className='flex-1 min-w-0'>
        <div className='flex flex-wrap items-center gap-2.5'>
          <h2 className='text-[20px] font-semibold text-slate-900 truncate'>
            {profile.name}
          </h2>
          <RoleBadge role={profile.role} />
          <StatusBadge isActive={profile.isActive} />
        </div>
        <p className='text-[14px] text-slate-500 mt-1 truncate'>
          {profile.email}
        </p>
        <p className='text-[13px] text-slate-400 mt-0.5'>
          Preparing for {profile.preparation}
        </p>
      </div>

      {!isEditing && (
        <button
          onClick={onEdit}
          className='self-start sm:self-center px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-[14px] font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 shrink-0'
        >
          <EditIcon />
          Edit profile
        </button>
      )}
    </div>
  );
}

function Avatar({ profilePicture, name, isUploading, onUpload }) {
  const initials = (name || 'S')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className='relative shrink-0 mx-auto sm:mx-0'>
      {profilePicture ? (
        <img
          src={profilePicture}
          alt={name}
          className='h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover border-4 border-white shadow-md'
        />
      ) : (
        <div className='h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-gradient-to-br from-[#1B2540] to-[#2A3559] text-[#F4B740] flex items-center justify-center text-[32px] font-semibold border-4 border-white shadow-md'>
          {initials}
        </div>
      )}
      <label
        title='Change profile picture'
        className='absolute bottom-0 right-0 h-9 w-9 rounded-full bg-[#11182B] text-[#F4B740] border-2 border-white flex items-center justify-center hover:bg-[#1B2540] transition-colors cursor-pointer'
      >
        {isUploading ? <Spinner /> : <CameraIcon />}
        <input
          type='file'
          accept='image/*'
          className='hidden'
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
      <path d='M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z' strokeLinecap='round' strokeLinejoin='round' />
      <circle cx='12' cy='13' r='3.5' />
    </svg>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === 'admin';
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[11.5px] font-medium ${
        isAdmin
          ? 'bg-purple-100 text-purple-700'
          : 'bg-[#F4B740]/15 text-[#946000]'
      }`}
    >
      {isAdmin ? 'Admin' : 'Student'}
    </span>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium ${
        isActive
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

// ---------- Personal details (editable) ----------

function PersonalDetailsCard({
  form,
  isEditing,
  isSaving,
  onChange,
  onSave,
  onCancel,
}) {
  return (
    <section className='bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7'>
      <div className='flex items-center justify-between mb-5'>
        <h3 className='text-[15px] font-semibold text-slate-900'>
          Personal details
        </h3>
        {isEditing && (
          <span className='text-[12px] text-amber-600 font-medium'>
            Editing
          </span>
        )}
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
        <Field label='Full name'>
          {isEditing ? (
            <input
              type='text'
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              minLength={2}
              className='input'
            />
          ) : (
            <ReadValue value={form.name} />
          )}
        </Field>

        <Field
          label='Email address'
          hint='Contact support to change your email'
        >
          <ReadValue value={form.emailDisplay} muted />
        </Field>

        <Field label='Phone number'>
          {isEditing ? (
            <input
              type='tel'
              value={form.phone}
              onChange={(e) =>
                onChange(
                  'phone',
                  e.target.value.replace(/\D/g, '').slice(0, 10)
                )
              }
              pattern='[0-9]{10}'
              className='input'
            />
          ) : (
            <ReadValue value={form.phone} />
          )}
        </Field>

        <Field
          label='Gender'
          hint='Only the library admin can change your gender'
        >
          <ReadValue value={capitalize(form.gender)} muted={isEditing} />
        </Field>

        <Field label='Preparing for' hint='Your exam category'>
          {isEditing ? (
            <select
              value={form.preparation}
              onChange={(e) => onChange('preparation', e.target.value)}
              className='input'
            >
              {PREPARATION_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : (
            <ReadValue value={form.preparation} />
          )}
        </Field>
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 0.55rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          font-size: 13.5px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus { border-color: #F4B740; box-shadow: 0 0 0 3px rgba(244,183,64,0.15); }
      `}</style>

      {isEditing && (
        <div className='flex gap-3 mt-6 pt-5 border-t border-slate-100'>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className='flex-1 sm:flex-none px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-[14px] font-medium hover:bg-slate-50 disabled:opacity-50'
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className='flex-1 sm:flex-none px-5 py-2.5 rounded-lg bg-[#11182B] text-white text-[14px] font-medium hover:bg-[#1B2540] disabled:opacity-60 flex items-center justify-center gap-2'
          >
            {isSaving ? (
              <>
                <Spinner /> Saving...
              </>
            ) : (
              'Save changes'
            )}
          </button>
        </div>
      )}
    </section>
  );
}

// ---------- Change password ----------

function ChangePasswordCard({ showToast }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const update = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fields.newPassword.length < 6) {
      setFormError('New password must be at least 6 characters.');
      return;
    }
    if (fields.newPassword !== fields.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setIsSaving(true);
    try {
      await changePassword({
        currentPassword: fields.currentPassword,
        newPassword: fields.newPassword,
      });
      showToast('Password changed successfully.');
      setFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setOpen(false);
    } catch (err) {
      setFormError(err.message || 'Could not change password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className='bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7'>
      <button
        onClick={() => setOpen((o) => !o)}
        className='w-full flex items-center justify-between'
      >
        <div className='text-left'>
          <h3 className='text-[15px] font-semibold text-slate-900'>
            Change password
          </h3>
          <p className='text-[12.5px] text-slate-500 mt-0.5'>
            Update the password used to sign in.
          </p>
        </div>
        <svg
          width='18'
          height='18'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d='M6 9l6 6 6-6' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className='mt-5 pt-5 border-t border-slate-100 space-y-4'
        >
          <Field label='Current password'>
            <input
              type='password'
              required
              value={fields.currentPassword}
              onChange={(e) => update('currentPassword', e.target.value)}
              className='input'
            />
          </Field>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <Field label='New password' hint='At least 6 characters'>
              <input
                type='password'
                required
                minLength={6}
                value={fields.newPassword}
                onChange={(e) => update('newPassword', e.target.value)}
                className='input'
              />
            </Field>
            <Field label='Confirm new password'>
              <input
                type='password'
                required
                minLength={6}
                value={fields.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                className='input'
              />
            </Field>
          </div>

          {formError && <p className='text-[13px] text-red-500'>{formError}</p>}

          <div className='flex justify-end'>
            <button
              type='submit'
              disabled={isSaving}
              className='px-5 py-2.5 rounded-lg bg-[#11182B] text-white text-[14px] font-medium hover:bg-[#1B2540] disabled:opacity-60 flex items-center gap-2'
            >
              {isSaving ? (
                <>
                  <Spinner /> Updating...
                </>
              ) : (
                'Update password'
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

// ---------- Account info (read-only, system fields) ----------

function AccountInfoCard({ profile }) {
  return (
    <aside className='bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 h-fit'>
      <h3 className='text-[15px] font-semibold text-slate-900 mb-5'>
        Account information
      </h3>
      <dl className='space-y-4'>
        <InfoRow label='Role' value={capitalize(profile.role)} />
        <InfoRow
          label='Account status'
          value={profile.isActive ? 'Active' : 'Inactive'}
        />
        <InfoRow label='Member since' value={formatDate(profile.createdAt)} />
        <InfoRow
          label='Last login'
          value={
            profile.lastLogin ? formatDateTime(profile.lastLogin) : 'Never'
          }
        />
        <InfoRow label='User ID' value={profile._id} mono />
      </dl>
    </aside>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div>
      <p className='text-[12px] text-slate-500'>{label}</p>
      <p
        className={`text-[13.5px] font-medium text-slate-900 mt-0.5 ${mono ? 'font-mono text-[12px] truncate' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

// ---------- Shared bits ----------

function Field({ label, hint, children }) {
  return (
    <div>
      <label className='text-[12.5px] font-medium text-slate-600 mb-1.5 block'>
        {label}
      </label>
      {children}
      {hint && <p className='text-[11.5px] text-slate-400 mt-1'>{hint}</p>}
    </div>
  );
}

function ReadValue({ value, muted }) {
  return (
    <p
      className={`text-[14px] ${muted ? 'text-slate-400' : 'text-slate-900 font-medium'}`}
    >
      {value || '—'}
    </p>
  );
}

function EditIcon() {
  return (
    <svg
      width='15'
      height='15'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
    >
      <path
        d='M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24' fill='none'>
      <circle
        cx='12'
        cy='12'
        r='10'
        stroke='currentColor'
        strokeWidth='3'
        className='opacity-25'
      />
      <path
        d='M22 12a10 10 0 0 1-10 10'
        stroke='currentColor'
        strokeWidth='3'
        strokeLinecap='round'
      />
    </svg>
  );
}

function capitalize(s) {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ---------- Loading skeleton ----------

function ProfileSkeleton() {
  return (
    <div className='min-h-screen bg-slate-50 pb-12'>
      <header className='bg-[#11182B] h-[140px]' />
      <main className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 space-y-6 animate-pulse'>
        <div className='bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex items-center gap-6'>
          <div className='h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-slate-200' />
          <div className='flex-1 space-y-2'>
            <div className='h-5 w-40 bg-slate-200 rounded' />
            <div className='h-3.5 w-56 bg-slate-200 rounded' />
          </div>
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 h-64' />
          <div className='bg-white rounded-2xl border border-slate-200 p-6 h-64' />
        </div>
      </main>
    </div>
  );
}

// ---------- Toast ----------

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div
      className='fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-[13.5px] font-medium text-white'
      style={{ backgroundColor: isError ? '#B42318' : '#0E7A5F' }}
    >
      {toast.message}
    </div>
  );
}
