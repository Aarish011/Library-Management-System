import { useState } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    try {
      setError('');
      await login(form);
      window.location.hash = '#/dashboard';
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className='login-page'>
      <form onSubmit={submit} className='login-card'>
        <h1>Admin Login</h1>
        <p>Sign in with an admin account.</p>
        <input placeholder='Email' value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder='Password' type='password' value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <div className='error'>{error}</div>}
        <button>Login</button>
      </form>
    </div>
  );
}