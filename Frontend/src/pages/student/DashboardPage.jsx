import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getActiveSubscription } from '../../api/subscriptionApi';
import { getActiveReservation } from '../../api/reservationApi';
import { getPaymentHistory } from '../../api/paymentApi';
import { getNotifications } from '../../api/notificationApi';
import { useNotificationSocket } from '../../hooks/useNotificationSocket';
import { getNotificationSocket } from '../../services/socket';
import { formatPlanName } from '../../utils/plansConfig';

function Icon({ name, className = 'w-5 h-5' }) {
  const paths = {
    subscription: (
      <path
        d='M9 12l2 2 4-4M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1z'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    ),
    seat: (
      <path
        d='M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M4 11h16l-1 9H5l-1-9zM8 20v1M16 20v1'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    ),
    payment: (
      <path
        d='M3 9h18M7 15h2M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    ),
    bell: (
      <path
        d='M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 0 1-3.46 0'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    ),
    seatBook: (
      <path
        d='M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M4 11h16l-1 9H5l-1-9z'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    ),
    renew: (
      <path
        d='M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0 1 14.9-3M20 14a8 8 0 0 1-14.9 3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    ),
    history: (
      <path
        d='M12 8v4l3 3M21 12a9 9 0 1 1-3-6.7M21 3v5h-5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    ),
    edit: (
      <path
        d='M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    ),
  };

  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

function titleCase(value) {
  if (!value) return 'None';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatMoney(value) {
  if (value === null || value === undefined) return 'Rs. 0';
  return `Rs. ${Number(value).toLocaleString('en-IN')}`;
}

function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

function StatCard({ icon, label, primary, secondary, accent = 'amber' }) {
  const accents = {
    amber: 'bg-[#F4B740]/10 text-[#946000]',
    teal: 'bg-[#3FC1A0]/10 text-[#0E7A5F]',
    blue: 'bg-[#5B9BF0]/10 text-[#1E5FA8]',
    pink: 'bg-[#E07AA0]/10 text-[#A13D63]',
  };

  return (
    <div className='bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-[13px] font-medium text-slate-500'>{label}</p>
          <p className='mt-2 text-[19px] font-semibold text-slate-900 truncate'>
            {primary}
          </p>
          <p className='mt-0.5 text-[13px] text-slate-500'>{secondary}</p>
        </div>
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${accents[accent]}`}
        >
          <Icon name={icon} className='w-5 h-5' />
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({ type }) {
  const map = {
    subscription: {
      icon: 'subscription',
      bg: 'bg-[#F4B740]/10 text-[#946000]',
    },
    payment: { icon: 'payment', bg: 'bg-[#3FC1A0]/10 text-[#0E7A5F]' },
    seat: { icon: 'seat', bg: 'bg-[#5B9BF0]/10 text-[#1E5FA8]' },
    notification: { icon: 'bell', bg: 'bg-[#E07AA0]/10 text-[#A13D63]' },
  };
  const cfg = map[type] || map.notification;

  return (
    <div
      className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}
    >
      <Icon name={cfg.icon} className='w-4 h-4' />
    </div>
  );
}

function QuickAction({ icon, label, sub, onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='group flex items-center gap-3 p-4 rounded-2xl border border-slate-200/70 bg-white hover:border-[#F4B740]/50 hover:shadow-md transition-all duration-200 text-left w-full'
    >
      <div className='h-10 w-10 rounded-xl bg-[#11182B] text-[#F4B740] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0'>
        <Icon name={icon} className='w-5 h-5' />
      </div>
      <div className='min-w-0'>
        <p className='text-[14px] font-semibold text-slate-900'>{label}</p>
        <p className='text-[12.5px] text-slate-500'>{sub}</p>
      </div>
    </button>
  );
}

function WelcomeSection() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2'>
      <div>
        <h1
          className='text-[26px] sm:text-[28px] text-slate-900'
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
        >
          Welcome back, {user?.name?.split(' ')[0] || 'Student'}
        </h1>
        <p className='mt-1 text-[14.5px] text-slate-500'>
          Your live library account summary is ready.
        </p>
      </div>
      <p className='text-[13px] text-slate-400'>{today}</p>
    </div>
  );
}

function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className='rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center'>
      <p className='text-[13.5px] text-slate-500'>{message}</p>
      {actionLabel && (
        <button
          type='button'
          onClick={onAction}
          className='mt-3 px-3 py-2 rounded-lg bg-[#11182B] text-white text-[13px] font-medium hover:bg-[#1B2540] transition-colors'
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function SubscriptionSection({ subscriptionData, onRenew }) {
  const subscription = subscriptionData?.subscription;

  if (!subscription) {
    return (
      <section className='bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm'>
        <h2 className='text-[16px] font-semibold text-slate-900 mb-5'>
          Current subscription
        </h2>
        <EmptyState
          message='No active subscription found.'
          actionLabel='View plans'
          onAction={onRenew}
        />
      </section>
    );
  }

  const totalDays = subscriptionData.totalDays || 1;
  const daysRemaining = subscriptionData.daysRemaining || 0;
  const pct = Math.min(
    100,
    Math.max(0, Math.round(((totalDays - daysRemaining) / totalDays) * 100))
  );

  return (
    <section className='bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm'>
      <div className='flex items-center justify-between mb-5'>
        <h2 className='text-[16px] font-semibold text-slate-900'>
          Current subscription
        </h2>
        <span className='px-2.5 py-1 rounded-full bg-[#F4B740]/10 text-[#946000] text-[12px] font-medium'>
          {titleCase(subscription.status)}
        </span>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5'>
        {[
          { label: 'Plan', value: formatPlanName(subscription.plan) },
          { label: 'Start date', value: formatDate(subscription.startDate) },
          { label: 'Expiry date', value: formatDate(subscription.endDate) },
          {
            label: 'Days left',
            value: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`,
          },
        ].map((f) => (
          <div key={f.label}>
            <p className='text-[12px] text-slate-500'>{f.label}</p>
            <p className='text-[14px] font-medium text-slate-900 mt-0.5'>
              {f.value}
            </p>
          </div>
        ))}
      </div>

      <div className='mb-5'>
        <div className='flex justify-between text-[12px] text-slate-500 mb-1.5'>
          <span>Plan usage</span>
          <span>{pct}% used</span>
        </div>
        <div className='h-2 rounded-full bg-slate-100 overflow-hidden'>
          <div
            className='h-full rounded-full bg-gradient-to-r from-[#F4B740] to-[#E0922A] transition-all duration-500'
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <button
        type='button'
        onClick={onRenew}
        className='px-4 py-2.5 rounded-lg bg-[#11182B] text-white text-[14px] font-medium hover:bg-[#1B2540] transition-colors'
      >
        Renew subscription
      </button>
    </section>
  );
}

function SeatSection({ reservationData, onViewSeat, onChangeSeat }) {
  const reservation = reservationData?.reservation;
  const seat = reservationData?.seat || reservation?.seat;

  if (!seat) {
    return (
      <section className='bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm'>
        <h2 className='text-[16px] font-semibold text-slate-900 mb-5'>
          My seat information
        </h2>
        <EmptyState
          message='No current seat booking found.'
          actionLabel='Book a seat'
          onAction={onChangeSeat}
        />
      </section>
    );
  }

  const status =
    reservation?.status === 'confirmed'
      ? 'Booked'
      : titleCase(reservation?.status);

  return (
    <section className='bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm'>
      <div className='flex items-center justify-between mb-5'>
        <h2 className='text-[16px] font-semibold text-slate-900'>
          My seat information
        </h2>
        <span className='px-2.5 py-1 rounded-full bg-[#3FC1A0]/10 text-[#0E7A5F] text-[12px] font-medium'>
          {status}
        </span>
      </div>

      <div className='grid grid-cols-3 gap-4 mb-5'>
        {[
          { label: 'Seat number', value: seat.seatNumber || 'Not assigned' },
          { label: 'Zone', value: titleCase(seat.zone) },
          { label: 'Seat status', value: titleCase(seat.status) },
        ].map((f) => (
          <div key={f.label}>
            <p className='text-[12px] text-slate-500'>{f.label}</p>
            <p className='text-[14px] font-medium text-slate-900 mt-0.5'>
              {f.value}
            </p>
          </div>
        ))}
      </div>

      <div className='flex flex-wrap gap-3'>
        <button
          type='button'
          onClick={onViewSeat}
          className='px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-[14px] font-medium hover:bg-slate-50 transition-colors'
        >
          View my seat layout
        </button>
        <button
          type='button'
          onClick={onChangeSeat}
          className='px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-[14px] font-medium hover:bg-slate-50 transition-colors'
        >
          Change seat
        </button>
      </div>
    </section>
  );
}

function ActivitySection({ items }) {
  return (
    <section className='bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm'>
      <h2 className='text-[16px] font-semibold text-slate-900 mb-5'>
        Recent activity
      </h2>
      {items.length === 0 ? (
        <EmptyState message='No recent activity yet.' />
      ) : (
        <div className='space-y-4'>
          {items.map((a, i) => (
            <div key={a.id} className='flex gap-3'>
              <div className='flex flex-col items-center'>
                <ActivityIcon type={a.type} />
                {i < items.length - 1 && (
                  <span className='w-px flex-1 bg-slate-200 mt-1' />
                )}
              </div>
              <div className='pb-4 min-w-0'>
                <p className='text-[14px] font-medium text-slate-900'>
                  {a.title}
                </p>
                <p className='text-[13px] text-slate-500'>{a.detail}</p>
                <p className='text-[12px] text-slate-400 mt-0.5'>{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function NotificationsSection({ notifications, onViewAll }) {
  return (
    <section className='bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm'>
      <div className='flex items-center justify-between mb-5'>
        <h2 className='text-[16px] font-semibold text-slate-900'>
          Notifications
        </h2>
        <button
          type='button'
          onClick={onViewAll}
          className='text-[13px] font-medium text-[#946000] hover:underline'
        >
          View all
        </button>
      </div>
      {notifications.length === 0 ? (
        <EmptyState message='No notifications yet.' />
      ) : (
        <div className='space-y-3'>
          {notifications.slice(0, 5).map((n) => (
            <div
              key={n._id}
              className='flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors'
            >
              <span
                className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!n.isRead ? 'bg-[#F4B740]' : 'bg-slate-300'}`}
              />
              <div className='min-w-0'>
                <p className='text-[13.5px] font-medium text-slate-900'>
                  {n.title}
                </p>
                <p className='text-[12.5px] text-slate-500 truncate'>
                  {n.message}
                </p>
              </div>
              <span className='ml-auto text-[12px] text-slate-400 shrink-0'>
                {timeAgo(n.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function QuickActionsSection({ navigate }) {
  const actions = [
    {
      icon: 'seatBook',
      label: 'Book seat',
      sub: 'Reserve your spot',
      path: '/book-seat',
    },
    {
      icon: 'renew',
      label: 'Renew subscription',
      sub: 'Extend your plan',
      path: '/subscription',
    },
    {
      icon: 'history',
      label: 'Payment history',
      sub: 'View past transactions',
      path: '/payments',
    },
    {
      icon: 'edit',
      label: 'Update profile',
      sub: 'Edit your details',
      path: '/profile',
    },
  ];

  return (
    <section>
      <h2 className='text-[16px] font-semibold text-slate-900 mb-4'>
        Quick actions
      </h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
        {actions.map((a) => (
          <QuickAction
            key={a.label}
            icon={a.icon}
            label={a.label}
            sub={a.sub}
            onClick={() => navigate(a.path)}
          />
        ))}
      </div>
    </section>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [reservationData, setReservationData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const handleRealtimeNotification = useCallback((notification) => {
    if (!notification?._id) return;
    setNotifications((current) => {
      if (current.some((item) => item._id === notification._id)) return current;
      return [notification, ...current];
    });
  }, []);

  useNotificationSocket(handleRealtimeNotification, getNotificationSocket);

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        const [subscriptionRes, reservationRes, paymentsRes, notificationsRes] =
          await Promise.all([
            getActiveSubscription(),
            getActiveReservation(),
            getPaymentHistory(),
            getNotifications(),
          ]);

        if (ignore) return;

        setSubscriptionData(
          subscriptionRes.success ? subscriptionRes.data : null
        );
        setReservationData(reservationRes.success ? reservationRes.data : null);
        setPayments(paymentsRes.success ? paymentsRes.data || [] : []);
        setNotifications(
          notificationsRes.success ? notificationsRes.data || [] : []
        );
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load dashboard data');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  const latestPayment = payments[0] || null;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const persistentRenewal = notifications.find(
    (notification) =>
      notification.type === 'renewal' && notification.isPersistent
  );
  const subscription = subscriptionData?.subscription;
  const reservation = reservationData?.reservation;
  const seat = reservationData?.seat || reservation?.seat;

  const activity = useMemo(() => {
    const items = [];

    if (subscription) {
      items.push({
        id: `subscription-${subscription._id}`,
        type: 'subscription',
        title: 'Subscription active',
        detail: `${formatPlanName(subscription.plan)} plan ends ${formatDate(subscription.endDate)}`,
        time: timeAgo(subscription.updatedAt || subscription.createdAt),
        date: subscription.updatedAt || subscription.createdAt,
      });
    }

    if (reservation && seat) {
      items.push({
        id: `seat-${reservation._id}`,
        type: 'seat',
        title:
          reservation.status === 'confirmed' ? 'Seat booked' : 'Seat reserved',
        detail: `Seat ${seat.seatNumber} in ${titleCase(seat.zone)} zone`,
        time: timeAgo(reservation.updatedAt || reservation.createdAt),
        date: reservation.updatedAt || reservation.createdAt,
      });
    }

    payments.slice(0, 3).forEach((payment) => {
      items.push({
        id: `payment-${payment._id}`,
        type: 'payment',
        title: `Payment ${titleCase(payment.status)}`,
        detail: `${formatMoney(payment.amount)} via ${titleCase(payment.paymentMethod)}`,
        time: timeAgo(payment.paymentDate || payment.createdAt),
        date: payment.paymentDate || payment.createdAt,
      });
    });

    notifications.slice(0, 2).forEach((notification) => {
      items.push({
        id: `notification-${notification._id}`,
        type: 'notification',
        title: notification.title,
        detail: notification.message,
        time: timeAgo(notification.createdAt),
        date: notification.createdAt,
      });
    });

    return items
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);
  }, [notifications, payments, reservation, seat, subscription]);

  return (
    <div
      className='min-h-screen bg-slate-50'
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8'>
        <WelcomeSection />

        {error && (
          <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        {persistentRenewal && (
          <div className='flex flex-col gap-3 border border-amber-300 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <p className='text-[14px] font-semibold text-amber-950'>
                {persistentRenewal.title}
              </p>
              <p className='mt-1 text-[13px] text-amber-800'>
                {persistentRenewal.message}
              </p>
            </div>
            <button
              type='button'
              onClick={() => navigate('/subscription')}
              className='shrink-0 rounded-lg bg-[#11182B] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#1B2540]'
            >
              Renew now
            </button>
          </div>
        )}

        {loading ? (
          <div className='rounded-2xl border border-slate-200/70 bg-white p-8 text-center text-slate-500'>
            Loading dashboard...
          </div>
        ) : (
          <>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
              <StatCard
                icon='subscription'
                label='Active subscription'
                primary={
                  subscription ? formatPlanName(subscription.plan) : 'No plan'
                }
                secondary={
                  subscription
                    ? `${subscriptionData?.daysRemaining || 0} days remaining`
                    : 'Choose a plan to start'
                }
                accent='amber'
              />
              <StatCard
                icon='seat'
                label='Current seat'
                primary={seat ? `Seat ${seat.seatNumber}` : 'No seat'}
                secondary={seat ? titleCase(seat.status) : 'Book your seat'}
                accent='blue'
              />
              <StatCard
                icon='payment'
                label='Payment status'
                primary={
                  latestPayment
                    ? titleCase(latestPayment.status)
                    : 'No payments'
                }
                secondary={
                  latestPayment
                    ? `Last paid ${formatDate(latestPayment.paymentDate)}`
                    : 'No transaction found'
                }
                accent='teal'
              />
              <StatCard
                icon='bell'
                label='Notifications'
                primary={`${unreadCount} unread`}
                secondary={
                  unreadCount > 0 ? 'New updates waiting' : 'All caught up'
                }
                accent='pink'
              />
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              <SubscriptionSection
                subscriptionData={subscriptionData}
                onRenew={() => navigate('/subscription')}
              />
              <SeatSection
                reservationData={reservationData}
                onViewSeat={() => navigate('/book-seat')}
                onChangeSeat={() => navigate('/book-seat')}
              />
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              <ActivitySection items={activity} />
              <NotificationsSection
                notifications={notifications}
                onViewAll={() => navigate('/notifications')}
              />
            </div>

            <QuickActionsSection navigate={navigate} />
          </>
        )}
      </main>
    </div>
  );
}

