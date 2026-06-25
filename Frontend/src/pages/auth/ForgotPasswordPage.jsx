import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/authApi';
import toast from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
      toast.success('Reset link sent to your email');
    } catch (error) {
      toast.error(error.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full bg-white rounded-xl shadow-lg p-8'>
        <div className='text-center mb-8'>
          <h2 className='text-3xl font-bold text-gray-800'>Forgot Password</h2>
          <p className='text-gray-500 mt-2'>We'll send you a reset link</p>
        </div>

        {submitted ? (
          <div className='text-center'>
            <div className='text-green-500 text-5xl mb-4'>✅</div>
            <h3 className='text-xl font-semibold text-gray-800 mb-2'>
              Check Your Email
            </h3>
            <p className='text-gray-600 mb-6'>
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <Link
              to='/login'
              className='text-blue-600 hover:underline font-medium'
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Email Address *
              </label>
              <input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition'
                placeholder='john@example.com'
                required
              />
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
            >
              {loading ? (
                <>
                  <FaSpinner className='animate-spin mr-2' />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            <div className='text-center'>
              <Link
                to='/login'
                className='text-blue-600 hover:underline text-sm'
              >
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
