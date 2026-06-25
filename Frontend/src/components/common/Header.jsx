import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getUnreadCount } from '../../api/notificationApi';
import Navbar from './Navbar';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    const loadUnreadCount = async () => {
      if (!isAuthenticated) {
        setUnreadCount(0);
        return;
      }

      try {
        const response = await getUnreadCount();
        if (!ignore && response.success) {
          setUnreadCount(response.data?.count || 0);
        }
      } catch (error) {
        if (!ignore) setUnreadCount(0);
      }
    };

    loadUnreadCount();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
  };

  const userData = user
    ? {
        name: user.name || 'Student',
        email: user.email || '',
        avatarUrl: user.profilePicture || '',
      }
    : { name: 'Student', email: '' };

  return (
    <Navbar
      isAuthenticated={isAuthenticated}
      user={userData}
      unreadCount={unreadCount}
      onLogout={handleLogout}
    />
  );
};

export default Header;