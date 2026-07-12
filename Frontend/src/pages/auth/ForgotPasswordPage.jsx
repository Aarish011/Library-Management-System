import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/authApi';
import toast from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';
import useActionCooldown from '../../hooks/useActionCooldown';

const ForgotPasswordPage = () => {
  const forgotPasswordCooldown = useActionCooldown(30000);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !forgotPasswordCooldown.guard((seconds) =>
        toast.error(`Please wait ${seconds}s before requesting another link`)
      )
    ) {
      return;
    }

    if (!email) {
      const message = 'Please enter your email';
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    forgotPasswordCooldown.startCooldown();
    try {
      await forgotPassword(email);
      setSubmitted(true);
      toast.success('Reset link sent to your email');
    } catch (error) {
      forgotPasswordCooldown.resetCooldown();
      const message = error.message || 'Failed to send reset link';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-start sm:items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-3 sm:py-12 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full bg-white rounded-xl shadow-lg p-5 sm:p-8'>
        <div className='text-center mb-6 sm:mb-8'>
          <h2 className='text-2xl sm:text-3xl font-bold text-gray-800'>Forgot Password</h2>
          <p className='text-gray-500 mt-2'>We'll send you a reset link</p>
        </div>

        {submitted ? (
          <div className='text-center'>
            <div className='text-green-500 text-5xl mb-4'>✅</div>
            <h3 className='text-xl font-semibold text-gray-800 mb-2'>
              Check Your Email
            </h3>
            <p className='text-gray-600 mb-2'>
              If an account exists for <strong>{email}</strong>, a password reset
              link will be sent shortly.
            </p>
            <p className='text-sm text-gray-500 mb-6'>
              For security, we do not reveal whether an email address is
              registered.
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
            {errorMessage && (
              <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                {errorMessage}
              </div>
            )}

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
              disabled={loading || forgotPasswordCooldown.isCoolingDown}
              className='w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
            >
              {loading ? (
                <>
                  <FaSpinner className='animate-spin mr-2' />
                Sending...
              </>
            ) : (
              forgotPasswordCooldown.isCoolingDown
                ? `Wait ${forgotPasswordCooldown.remainingSeconds}s`
                : 'Send Reset Link'
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
