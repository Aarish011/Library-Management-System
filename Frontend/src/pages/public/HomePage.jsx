import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleViewSeats = () => {
    if (!isAuthenticated) {
      toast.error('Please login or register to view seats');
      navigate('/login');
      return;
    }

    navigate('/seats');
  };

  return (
    <div
      className='min-h-[calc(100vh-80px)] bg-slate-50'
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <link
        href='https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Inter:wght@400;500;600&display=swap'
        rel='stylesheet'
      />

      {/* HERO SECTION */}
      <section className='relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-[#11182B] via-[#1B2540] to-[#11182B]' />

        <div className='relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center'>
          {/* LEFT CONTENT */}
          <div>
            <span className='inline-flex items-center px-4 py-2 rounded-full bg-[#F4B740]/15 text-[#F4B740] text-sm font-semibold mb-6'>
              Smart Library Management System
            </span>

            <h1
              className='text-4xl md:text-6xl text-white leading-tight mb-6'
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
            >
              Find your perfect
              <span className='text-[#F4B740]'> study space</span>
            </h1>

            <p className='text-lg text-[#9AA4C2] max-w-xl mb-8'>
              Book seats, manage subscriptions, track renewals, and access your
              Bookshelf dashboard from one clean platform.
            </p>

            <div className='flex flex-wrap gap-4'>
              <Link
                to={isAuthenticated ? '/dashboard' : '/register'}
                className='px-7 py-3 bg-[#F4B740] text-[#412402] rounded-xl font-semibold hover:bg-[#FAC775] transition shadow-md'
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
              </Link>

              <button
                onClick={handleViewSeats}
                className='px-7 py-3 bg-white/5 text-white rounded-xl font-semibold border border-white/15 hover:border-[#F4B740]/60 transition'
              >
                View Seats
              </button>
            </div>
          </div>

          {/* RIGHT CARD */}
          <div className='bg-white rounded-3xl shadow-xl border border-slate-100 p-6'>
            <div className='grid grid-cols-2 gap-4 mb-6'>
              <div className='bg-[#F4B740]/10 rounded-2xl p-5'>
                <h3 className='text-3xl font-bold text-[#946000]'>75</h3>
                <p className='text-sm text-slate-600 mt-1'>Study Seats</p>
              </div>

              <div className='bg-indigo-50 rounded-2xl p-5'>
                <h3 className='text-3xl font-bold text-indigo-600'>12 hrs</h3>
                <p className='text-sm text-slate-600 mt-1'>Daily Access</p>
              </div>

              <div className='bg-emerald-50 rounded-2xl p-5'>
                <h3 className='text-3xl font-bold text-emerald-600'>Live</h3>
                <p className='text-sm text-slate-600 mt-1'>Seat Status</p>
              </div>

              <div className='bg-slate-50 rounded-2xl p-5'>
                <h3 className='text-3xl font-bold text-slate-700'>Easy</h3>
                <p className='text-sm text-slate-600 mt-1'>Renewals</p>
              </div>
            </div>

            <div className='rounded-2xl bg-[#11182B] text-white p-6'>
              <h3
                className='text-xl font-bold mb-3'
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Why Bookshelf?
              </h3>

              <div className='space-y-3 text-sm text-[#C7CCDC]'>
                <p>✓ Reserve your preferred seat</p>
                <p>✓ Manage monthly plans</p>
                <p>✓ Get renewal reminders</p>
                <p>✓ Track payments and subscriptions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className='max-w-7xl mx-auto px-6 py-14'>
        <div className='grid md:grid-cols-3 gap-6'>
          <FeatureCard
            title='Seat Booking'
            desc='Choose from 75 seats across the library with a clean visual layout.'
          />
          <FeatureCard
            title='Subscription Plans'
            desc='Basic, reserved seat, locker add-ons, and renewals.'
          />
          <FeatureCard
            title='Student Dashboard'
            desc='Manage bookings, profile, payments, and notifications.'
          />
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ title, desc }) => {
  return (
    <div className='bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition'>
      <div className='w-12 h-12 rounded-xl bg-[#F4B740]/15 text-[#946000] flex items-center justify-center font-bold mb-4'>
        ✓
      </div>

      <h3 className='text-xl font-bold text-slate-800 mb-2'>{title}</h3>

      <p className='text-slate-600 text-sm leading-relaxed'>{desc}</p>
    </div>
  );
};

export default HomePage;
