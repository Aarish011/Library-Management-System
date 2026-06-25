import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminRoutes from './routes/AdminRoutes';
import './index.css';

export default function App() {
  return <AdminAuthProvider><AdminRoutes /></AdminAuthProvider>;
}