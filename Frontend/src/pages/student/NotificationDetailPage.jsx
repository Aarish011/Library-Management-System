import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getNotification } from '../../api/notificationApi';

export default function NotificationDetailPage() {
  const { notificationId } = useParams();
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');

    getNotification(notificationId)
      .then((response) => {
        if (!ignore) setNotification(response.data);
      })
      .catch((err) => {
        if (!ignore) setError(err.message || 'Failed to load notification');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [notificationId]);

  return (
    <div className='min-h-screen bg-slate-50 pb-12' style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className='bg-[#11182B]'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <button
            type='button'
            onClick={() => navigate('/notifications')}
            className='text-sm font-medium text-[#F4B740] hover:underline'
          >
            Back to notifications
          </button>
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {loading ? (
          <div className='rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500'>
            Loading notification...
          </div>
        ) : error ? (
          <div className='rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700'>
            {error}
          </div>
        ) : notification ? (
          <article className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
            {notification.bannerUrl ? (
              <img
                src={notification.bannerUrl}
                alt='Notification banner'
                className='h-64 w-full object-cover sm:h-80'
              />
            ) : (
              <div className='h-32 bg-[#11182B]' />
            )}

            <div className='p-6 sm:p-8'>
              <div className='flex flex-wrap items-center gap-2 mb-4'>
                <span className='rounded-full bg-[#F4B740]/15 px-2.5 py-1 text-xs font-medium text-[#946000]'>
                  {notification.type || 'info'}
                </span>
                <span className='text-xs text-slate-400'>{formatDate(notification.createdAt)}</span>
                {!notification.isRead && (
                  <span className='rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700'>
                    New
                  </span>
                )}
              </div>

              <h1 className='text-2xl font-semibold text-slate-900 sm:text-3xl'>{notification.title}</h1>
              <p className='mt-5 whitespace-pre-line text-[15px] leading-7 text-slate-600'>{notification.message}</p>

              {notification.actionUrl && (
                <Link
                  to={notification.actionUrl}
                  className='mt-7 inline-flex rounded-lg bg-[#11182B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1B2540]'
                >
                  Open related page
                </Link>
              )}
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
