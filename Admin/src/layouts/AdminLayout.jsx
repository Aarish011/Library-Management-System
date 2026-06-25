import Sidebar from '../components/common/Sidebar';
import Topbar from '../components/common/Topbar';

export default function AdminLayout({ current, children }) {
  return (
    <div className='admin-shell'>
      <Sidebar current={current} />
      <div className='admin-main'>
        <Topbar />
        <main>{children}</main>
      </div>
    </div>
  );
}