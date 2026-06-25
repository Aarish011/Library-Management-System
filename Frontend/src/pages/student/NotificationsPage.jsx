import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useNotificationApi from '../../hooks/useNotificationApi';
import { useNotificationSocket } from '../../hooks/useNotificationSocket';
import { getNotificationSocket } from '../../services/socket';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'info', label: 'Info' },
  { id: 'warning', label: 'Warning' },
  { id: 'success', label: 'Success' },
  { id: 'error', label: 'Error' },
  { id: 'renewal', label: 'Renewal' },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reload,
    markNotificationRead,
    markEveryNotificationRead,
    removeNotification,
    prependNotification,
  } = useNotificationApi({ limit: 10 });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRealtimeNotification = useCallback((notification) => {
    prependNotification(notification);
    setToast({ message: 'New notification received.', type: 'info' });
    setTimeout(() => setToast(null), 3000);
  }, [prependNotification]);

  useNotificationSocket(handleRealtimeNotification, getNotificationSocket);

  const visibleNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'unread') {
      return notifications.filter((notification) => !notification.isRead);
    }
    return notifications.filter((notification) => notification.type === activeFilter);
  }, [activeFilter, notifications]);

  const grouped = useMemo(
    () => groupByDate(visibleNotifications),
    [visibleNotifications]
  );

  const handleMarkRead = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification._id);
      } catch (err) {
        showToast(err.message || 'Could not mark notification as read.', 'error');
        return;
      }
    }

    navigate(`/notifications/${notification._id}`);
  };

  const handleMarkAllRead = async () => {
    try {
      await markEveryNotificationRead();
      showToast('All notifications marked as read.');
    } catch (err) {
      showToast(err.message || 'Could not mark all notifications as read.', 'error');
    }
  };

  const handleDelete = async (notification) => {
    try {
      await removeNotification(notification._id);
      showToast('Notification deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete notification.', 'error');
    }
  };

  return (
    <div
      className='min-h-screen bg-slate-50 pb-12'
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <header className='bg-white border-b border-slate-200'>
        <div className='max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-start justify-between gap-4'>
          <div>
            <h1
              className='text-[24px] text-slate-900'
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
            >
              Notifications
            </h1>
            <p className='text-[13.5px] text-slate-500 mt-1'>
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : "You're all caught up."}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type='button'
              onClick={handleMarkAllRead}
              className='shrink-0 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 text-[13px] font-medium hover:bg-slate-50 transition-colors'
            >
              Mark all as read
            </button>
          )}
        </div>
      </header>

      <main className='max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {error && (
          <div className='mb-5 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center justify-between gap-3'>
            <span>{error}</span>
            <button type='button' onClick={reload} className='font-semibold hover:underline'>
              Retry
            </button>
          </div>
        )}

        <div className='flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1'>
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type='button'
              onClick={() => setActiveFilter(filter.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                activeFilter === filter.id
                  ? 'bg-[#11182B] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {filter.label}
              {filter.id === 'unread' && unreadCount > 0 && (
                <span
                  className={`ml-1.5 ${activeFilter === filter.id ? 'text-[#F4B740]' : 'text-slate-400'}`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <ListSkeleton />
        ) : visibleNotifications.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          <div className='space-y-6'>
            {grouped.map((group) => (
              <div key={group.label}>
                <p className='text-[12px] font-medium text-slate-400 uppercase tracking-wide mb-2.5 px-1'>
                  {group.label}
                </p>
                <div className='bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden'>
                  {group.items.map((notification) => (
                    <NotificationRow
                      key={notification._id}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}

            {hasMore && (
              <div className='flex justify-center pt-2'>
                <button
                  type='button'
                  onClick={loadMore}
                  disabled={loadingMore}
                  className='px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-[13.5px] font-medium hover:bg-slate-50 disabled:opacity-60'
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Toast toast={toast} />
    </div>
  );
}

function NotificationRow({ notification, onMarkRead, onDelete }) {
  return (
    <div
      onClick={() => onMarkRead(notification)}
      className={`group flex items-start gap-3.5 px-4 sm:px-5 py-4 cursor-pointer transition-colors hover:bg-slate-50 ${
        !notification.isRead ? 'bg-[#F4B740]/5' : ''
      }`}
    >
      <TypeIcon type={notification.type} />

      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <p
            className={`text-[14px] truncate ${
              !notification.isRead
                ? 'font-semibold text-slate-900'
                : 'font-medium text-slate-700'
            }`}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className='h-2 w-2 rounded-full bg-[#F4B740] shrink-0' />
          )}
        </div>
        <p className='text-[13px] text-slate-500 mt-0.5'>
          {notification.message}
        </p>
        <p className='text-[12px] text-slate-400 mt-1'>
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      <button
        type='button'
        onClick={(event) => {
          event.stopPropagation();
          onDelete(notification);
        }}
        title='Delete notification'
        className='opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50'
      >
        <svg
          width='15'
          height='15'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <path
            d='M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </button>
    </div>
  );
}

function TypeIcon({ type }) {
  const config = {
    info: {
      bg: 'bg-[#5B9BF0]/15 text-[#2563EB]',
      path: <path d='M12 17v-5M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' strokeLinecap='round' strokeLinejoin='round' />,
    },
    warning: {
      bg: 'bg-[#F4B740]/15 text-[#946000]',
      path: <path d='M12 9v4M12 17h.01M10.3 4.2 2.3 18a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-13.8a2 2 0 0 0-3.4 0z' strokeLinecap='round' strokeLinejoin='round' />,
    },
    success: {
      bg: 'bg-[#3FC1A0]/15 text-[#0E7A5F]',
      path: <path d='m9 12 2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' strokeLinecap='round' strokeLinejoin='round' />,
    },
    error: {
      bg: 'bg-red-100 text-red-600',
      path: <path d='m15 9-6 6M9 9l6 6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' strokeLinecap='round' strokeLinejoin='round' />,
    },
    renewal: {
      bg: 'bg-[#F4B740]/15 text-[#946000]',
      path: <path d='M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0 1 14.9-3M20 14a8 8 0 0 1-14.9 3' strokeLinecap='round' strokeLinejoin='round' />,
    },
  };
  const cfg = config[type] || config.info;

  return (
    <div
      className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}
    >
      <svg
        viewBox='0 0 24 24'
        width='16'
        height='16'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
      >
        {cfg.path}
      </svg>
    </div>
  );
}

function EmptyState({ filter }) {
  return (
    <div className='bg-white rounded-2xl border border-dashed border-slate-300 py-14 text-center'>
      <div className='h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3'>
        <svg
          width='22'
          height='22'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.8'
        >
          <path
            d='M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 0 1-3.46 0'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </div>
      <p className='text-[14px] font-medium text-slate-700'>
        {filter === 'unread' ? 'No unread notifications' : 'No notifications here'}
      </p>
      <p className='text-[13px] text-slate-400 mt-1'>
        Updates about your account, renewal, payments, and library activity will appear here.
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className='bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 animate-pulse'>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className='flex items-start gap-3.5 px-5 py-4'>
          <div className='h-9 w-9 rounded-full bg-slate-200 shrink-0' />
          <div className='flex-1 space-y-2'>
            <div className='h-3.5 w-1/3 bg-slate-200 rounded' />
            <div className='h-3 w-2/3 bg-slate-200 rounded' />
          </div>
        </div>
      ))}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const colors = { success: '#0E7A5F', error: '#B42318', info: '#11182B' };
  return (
    <div
      className='fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-[13.5px] font-medium text-white'
      style={{ backgroundColor: colors[toast.type] || colors.success }}
    >
      {toast.message}
    </div>
  );
}

function groupByDate(items) {
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  const now = new Date();
  items.forEach((notification) => {
    const date = new Date(notification.createdAt);
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) groups.Today.push(notification);
    else if (isYesterday) groups.Yesterday.push(notification);
    else groups.Earlier.push(notification);
  });

  return Object.entries(groups)
    .filter(([, notifications]) => notifications.length > 0)
    .map(([label, notifications]) => ({ label, items: notifications }));
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}