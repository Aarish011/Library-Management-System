import { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import AdminPrivateRoute from './AdminPrivateRoute';
import AdminLoginPage from '../pages/auth/AdminLoginPage';
import DashboardPage from '../pages/DashboardPage';
import StudentsPage from '../pages/StudentsPage';
import SeatsPage from '../pages/SeatsPage';
import SubscriptionsPage from '../pages/SubscriptionsPage';
import PaymentsPage from '../pages/PaymentsPage';
import NotificationsPage from '../pages/NotificationsPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import AlumniPage from '../pages/AlumniPage';
import RenewalsDuePage from '../pages/RenewalsDuePage';
import IssuesPage from '../pages/IssuesPage';
import GeneralAreaPage from '../pages/GeneralAreaPage';
import CareerApplicationsPage from '../pages/CareerApplicationsPage';
import AdmissionLeadsPage from '../pages/AdmissionLeadsPage';

const pages = { '/dashboard': DashboardPage, '/students': StudentsPage, '/alumni': AlumniPage, '/admission-leads': AdmissionLeadsPage, '/seats': SeatsPage, '/general-area': GeneralAreaPage, '/subscriptions': SubscriptionsPage, '/renewals': RenewalsDuePage, '/payments': PaymentsPage, '/issues': IssuesPage, '/careers': CareerApplicationsPage, '/notifications': NotificationsPage, '/reports': ReportsPage, '/settings': SettingsPage };

export default function AdminRoutes() {
  const [path, setPath] = useState(window.location.hash.replace('#', '') || '/dashboard');
  useEffect(() => { const onHash = () => setPath(window.location.hash.replace('#', '') || '/dashboard'); window.addEventListener('hashchange', onHash); if (!window.location.hash) window.location.hash = '#/dashboard'; return () => window.removeEventListener('hashchange', onHash); }, []);
  if (path === '/login') return <AdminLoginPage />;
  const Page = pages[path] || DashboardPage;
  return <AdminPrivateRoute><AdminLayout current={path}><Page /></AdminLayout></AdminPrivateRoute>;
}
