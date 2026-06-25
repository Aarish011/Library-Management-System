import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLANS, computePrice, getPlan } from '../../utils/plansConfig';
import { fetchMySubscription } from '../../api/subscriptionApi';

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submittingPlanId, setSubmittingPlanId] = useState(null);
  const [toast, setToast] = useState(null);

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await fetchMySubscription();
      setSubscriptionData(data);
    } catch (err) {
      setLoadError(err.message || 'Could not load your subscription.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleSubscribe = useCallback(
    (planConfig) => {
      navigate('/payments', { state: { selectedPlan: planConfig } });
    },
    [navigate]
  );

  if (loading) return <SubscriptionSkeleton />;

  return (
    <div
      className='min-h-screen bg-slate-50 pb-14'
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <header className='bg-[#11182B]'>
        <div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-9 pb-16'>
          <h1
            className='text-[26px] text-white'
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
          >
            Subscription plans
          </h1>
          <p className='text-[14px] text-[#9AA4C2] mt-1.5'>
            Choose your monthly library fee package and optional locker during payment.
          </p>
        </div>
      </header>

      <main className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 space-y-6'>
        {loadError && (
          <div className='px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center justify-between gap-3'>
            <span>{loadError}</span>
            <button type='button' onClick={loadSubscription} className='font-semibold hover:underline'>
              Retry
            </button>
          </div>
        )}

        <CurrentPlanCard subscriptionData={subscriptionData} />


        <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={subscriptionData?.subscription?.plan === plan.plan}
              hasCurrentPlan={Boolean(subscriptionData?.subscription)}
              onSubscribe={() => handleSubscribe(plan)}
              isSubmitting={submittingPlanId === plan.id}
            />
          ))}
        </div>

        <ComparisonNote />

        <BookSeatTeaser onBookSeat={() => navigate('/book-seat')} />
      </main>

      <Toast toast={toast} />
    </div>
  );
}

function CurrentPlanCard({ subscriptionData }) {
  const subscription = subscriptionData?.subscription;
  const plan = getPlan(subscription?.plan);
  const daysLeft = subscriptionData?.daysRemaining ?? null;
  const totalDays = subscriptionData?.totalDays ?? plan?.duration ?? 1;
  const usedPct =
    daysLeft === null
      ? 0
      : Math.min(100, Math.max(0, Math.round(((totalDays - daysLeft) / totalDays) * 100)));

  return (
    <div className='bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
      <div className='min-w-0 flex-1'>
        <p className='text-[12px] text-slate-500'>Your current plan</p>
        <div className='flex flex-wrap items-center gap-2.5 mt-1'>
          <h2 className='text-[18px] font-semibold text-slate-900'>
            {plan?.name ?? 'No active plan'}
          </h2>
          {subscription && (
            <span className='px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-[#F4B740]/15 text-[#946000]'>
              {capitalize(subscription.status)}
            </span>
          )}
        </div>
        {subscription ? (
          <div className='mt-3 space-y-2'>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]'>
              <Info label='Started' value={formatDate(subscription.startDate)} />
              <Info label='Expires' value={formatDate(subscription.endDate)} />
              <Info label='Amount' value={`Rs. ${subscription.amount?.toLocaleString('en-IN') || 0}`} />
              <Info label='Seat' value={subscription.seat?.seatNumber ? `Seat ${subscription.seat.seatNumber}` : 'Not assigned'} />
            </div>
            <div>
              <div className='flex justify-between text-[12px] text-slate-500 mb-1.5'>
                <span>Plan usage</span>
                <span>{usedPct}% used</span>
              </div>
              <div className='h-2 rounded-full bg-slate-100 overflow-hidden'>
                <div className='h-full rounded-full bg-[#F4B740]' style={{ width: `${usedPct}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <p className='text-[13px] text-slate-500 mt-1'>Choose a plan below to activate your membership.</p>
        )}
      </div>

      {daysLeft !== null && (
        <div className='text-left sm:text-right'>
          <p className='text-[24px] font-semibold text-slate-900'>{daysLeft}</p>
          <p className='text-[12px] text-slate-500'>days remaining</p>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className='text-[12px] text-slate-500'>{label}</p>
      <p className='font-medium text-slate-900'>{value}</p>
    </div>
  );
}

function PlanCard({ plan, isCurrent, hasCurrentPlan, onSubscribe, isSubmitting }) {
  const price = computePrice(plan);

  return (
    <div
      className={`relative bg-white rounded-2xl border p-6 sm:p-7 flex flex-col transition-shadow ${
        plan.highlight ? 'border-[#F4B740] shadow-md' : 'border-slate-200 shadow-sm'
      }`}
    >
      {plan.highlight && (
        <span className='absolute -top-3 left-6 px-3 py-1 rounded-full bg-[#F4B740] text-[#412402] text-[11px] font-semibold'>
          Best value
        </span>
      )}

      <h3 className='text-[17px] font-semibold text-slate-900'>{plan.name}</h3>
      <p className='text-[13px] text-slate-500 mt-1'>{plan.tagline}</p>

      <div className='mt-4 flex items-baseline gap-1'>
        <span className='text-[30px] font-semibold text-slate-900'>
          Rs. {price.toLocaleString('en-IN')}
        </span>
      </div>
      <p className='text-[12px] text-slate-400 mt-0.5'>
        {plan.duration} days membership
      </p>

      <ul className='mt-5 space-y-2.5 flex-1'>
        {plan.features.map((feature) => (
          <li
            key={feature}
            className='flex items-start gap-2.5 text-[13.5px] text-slate-600'
          >
            <CheckIcon /> {feature}
          </li>
        ))}
      </ul>

      <button
        type='button'
        onClick={onSubscribe}
        disabled={isCurrent || isSubmitting}
        className={`mt-6 w-full py-2.5 rounded-lg text-[14px] font-medium transition-colors flex items-center justify-center gap-2 ${
          isCurrent
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : plan.highlight
              ? 'bg-[#11182B] text-white hover:bg-[#1B2540]'
              : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
        } disabled:opacity-70`}
      >
        {isSubmitting ? (
          <>
            <Spinner /> Processing...
          </>
        ) : isCurrent ? (
          'Current plan'
        ) : hasCurrentPlan ? (
          'Switch plan'
        ) : (
          'Activate plan'
        )}
      </button>
    </div>
  );
}

function ComparisonNote() {
  return (
    <div className='bg-white rounded-2xl border border-slate-200 p-5 sm:p-6'>
      <p className='text-[13px] text-slate-500'>
        <span className='font-medium text-slate-700'>Note: </span>
        Library Access is Rs. 1250 per month without seat reservation. The Reserved Seat package is Rs. 1500 per month and confirms your selected seat after payment. Locker is optional and adds a refundable Rs. 250 deposit during payment.
      </p>
    </div>
  );
}

function BookSeatTeaser({ onBookSeat }) {
  return (
    <div className='bg-[#11182B] rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
      <div>
        <p className='text-[15px] font-semibold text-white'>Need a study seat?</p>
        <p className='text-[13px] text-[#9AA4C2] mt-1'>
          Choose an available seat from the live library map. Seat reservation uses the Rs. 1500 package.
        </p>
      </div>
      <button
        type='button'
        onClick={onBookSeat}
        className='shrink-0 px-5 py-2.5 rounded-lg bg-[#F4B740] text-[#412402] text-[14px] font-semibold hover:bg-[#FAC775] transition-colors'
      >
        Book Seat
      </button>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#0E7A5F' strokeWidth='2.2' className='mt-0.5 shrink-0'>
      <path d='M20 6L9 17l-5-5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24' fill='none'>
      <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' className='opacity-25' />
      <path d='M22 12a10 10 0 0 1-10 10' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
    </svg>
  );
}

function SubscriptionSkeleton() {
  return (
    <div className='min-h-screen bg-slate-50 pb-14'>
      <header className='bg-[#11182B] h-[148px]' />
      <main className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 space-y-6 animate-pulse'>
        <div className='bg-white rounded-2xl border border-slate-200 h-32' />
        <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
          <div className='bg-white rounded-2xl border border-slate-200 h-80' />
          <div className='bg-white rounded-2xl border border-slate-200 h-80' />
          <div className='bg-white rounded-2xl border border-slate-200 h-80' />
        </div>
      </main>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div
      className='fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-[13.5px] font-medium text-white'
      style={{ backgroundColor: isError ? '#B42318' : '#0E7A5F' }}
    >
      {toast.message}
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function capitalize(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
