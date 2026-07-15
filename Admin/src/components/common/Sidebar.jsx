const items = [
  ['#/dashboard', 'Dashboard'],
  ['#/students', 'Students'],
  ['#/alumni', 'Alumni'],
  ['#/admission-leads', 'Admission Leads'],
  ['#/seats', 'Seats'],
  ['#/general-area', 'General Area'],
  ['#/subscriptions', 'Subscriptions'],
  ['#/renewals', 'Renewals Due'],
  ['#/payments', 'Payments'],
  ['#/issues', 'Student Issues'],
  ['#/careers', 'Careers'],
  ['#/notifications', 'Notifications'],
  ['#/reports', 'Reports'],
  ['#/settings', 'Settings'],
];

export default function Sidebar({ current }) {
  return (
    <aside className='sidebar'>
      <div className='brand'>Bookshelf Admin</div>
      <nav>{items.map(([href, label]) => <a key={href} href={href} className={current === href.slice(1) ? 'active' : ''}>{label}</a>)}</nav>
    </aside>
  );
}
