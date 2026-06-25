import { Link, useLocation } from 'react-router-dom';
import { formatPlanName } from '../../utils/plansConfig';

export default function PaymentSuccessPage() {
  const { state } = useLocation();
  const payment = state?.payment;
  const subscription = state?.subscription;

  return (
    <div className='min-h-[60vh] flex items-center justify-center px-4'>
      <div className='max-w-lg w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-7 text-center'>
        <div className='h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4'>
          <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2'>
            <path d='M20 6 9 17l-5-5' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </div>
        <h1 className='text-2xl font-semibold text-slate-900'>Payment successful</h1>
        <p className='mt-2 text-sm text-slate-500'>
          Your payment was verified by the backend and your subscription is now active.
        </p>

        <div className='mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4 text-left space-y-2 text-sm'>
          <Info label='Package' value={formatPlanName(subscription?.plan) || 'Activated'} />
          <Info label='Payment status' value={payment?.status || 'paid'} />
          <Info label='Amount' value={payment?.amount ? `Rs. ${payment.amount.toLocaleString('en-IN')}` : 'Confirmed'} />
          <Info label='Payment ID' value={payment?.razorpayPaymentId || payment?._id || 'Verified'} mono />
        </div>

        <div className='mt-6 flex flex-col sm:flex-row gap-3 justify-center'>
          <Link to='/dashboard' className='px-5 py-2.5 rounded-lg bg-[#11182B] text-white text-sm font-medium hover:bg-[#1B2540]'>
            Go to dashboard
          </Link>
          <Link to='/subscription' className='px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50'>
            View subscription
          </Link>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono }) {
  return (
    <div className='flex justify-between gap-4'>
      <span className='text-slate-500'>{label}</span>
      <span className={`font-medium text-slate-900 text-right ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</span>
    </div>
  );
}
