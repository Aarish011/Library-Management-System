import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Layouts
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';

// Public Pages
import HomePage from '../pages/public/HomePage';
import PlansPage from '../pages/public/PlansPage';
import AboutPage from '../pages/public/AboutPage';
import ContactPage from '../pages/public/ContactPage';
import CareerPage from '../pages/public/CareerPage';

// Student Pages
import DashboardPage from '../pages/student/DashboardPage';
import SeatSelectionPage from '../pages/student/SeatSelectionPage';
import PaymentPage from '../pages/student/PaymentPage';
import SubscriptionPage from '../pages/student/SubscriptionPage';
import NotificationsPage from '../pages/student/NotificationsPage';
import NotificationDetailPage from '../pages/student/NotificationDetailPage';
import IssuePage from '../pages/student/IssuePage';
import ProfilePage from '../pages/student/ProfilePage';
import PaymentSuccessPage from '../pages/student/PaymentSuccessPage';

// Route Guards
import PrivateRoute from './PrivateRoute';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<MainLayout />}>
          <Route path='/' element={<HomePage />} />
          <Route path='/plans' element={<PlansPage />} />
          <Route path='/about' element={<AboutPage />} />
          <Route path='/contact' element={<ContactPage />} />
          <Route path='/career' element={<CareerPage />} />
        </Route>

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route
            path='/login'
            element={
              isAuthenticated ? <Navigate to='/dashboard' /> : <LoginPage />
            }
          />
          <Route
            path='/register'
            element={
              isAuthenticated ? <Navigate to='/dashboard' /> : <RegisterPage />
            }
          />
          <Route path='/forgot-password' element={<ForgotPasswordPage />} />
          <Route path='/reset-password/:token' element={<ResetPasswordPage />} />
        </Route>

        {/* Protected Student Routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            <Route path='/dashboard' element={<DashboardPage />} />
            <Route path='/book-seat' element={<SeatSelectionPage />} />
            <Route path='/payments' element={<PaymentPage />} />
            <Route path='/subscription' element={<SubscriptionPage />} />
            <Route path='/support' element={<IssuePage />} />
            <Route path='/notifications' element={<NotificationsPage />} />
            <Route path='/notifications/:notificationId' element={<NotificationDetailPage />} />
            <Route path='/profile' element={<ProfilePage />} />
            <Route path='/payment-success' element={<PaymentSuccessPage />} />
            {/* Add more student routes here */}
          </Route>
        </Route>

        {/* 404 */}
        <Route path='*' element={<Navigate to='/' />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
