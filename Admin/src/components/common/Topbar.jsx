import { useAdminAuth } from '../../hooks/useAdminAuth';

export default function Topbar() {
  const { admin, logout } = useAdminAuth();
  return (
    <header className='topbar'>
      <div>
        <p>Admin Portal</p>
        <strong>{admin?.name || 'Admin'}</strong>
      </div>
      <button onClick={logout}>Logout</button>
    </header>
  );
}