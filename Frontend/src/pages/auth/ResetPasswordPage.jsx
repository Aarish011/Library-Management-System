import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';
import { resetPassword } from '../../api/authApi';
import useActionCooldown from '../../hooks/useActionCooldown';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const resetCooldown = useActionCooldown(5000);
  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !resetCooldown.guard((seconds) =>
        toast.error(`Please wait ${seconds}s before trying again`)
      )
    ) {
      return;
    }

    if (form.password.length < 6) {
      const message = 'Password must be at least 6 characters';
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    if (form.password !== form.confirmPassword) {
      const message = 'Passwords do not match';
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    resetCooldown.startCooldown();
    try {
      const response = await resetPassword(token, form.password);
      toast.success(response.message || 'Password reset successfully');
      navigate('/login');
    } catch (error) {
      const message = error.message || 'Could not reset password';
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
          <h2 className='text-2xl sm:text-3xl font-bold text-gray-800'>Reset Password</h2>
          <p className='text-gray-500 mt-2'>Create a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-5'>
          {errorMessage && (
            <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
              {errorMessage}
            </div>
          )}

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              New Password *
            </label>
            <input
              type='password'
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition'
              placeholder='At least 6 characters'
              minLength={6}
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Confirm Password *
            </label>
            <input
              type='password'
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition'
              placeholder='Re-enter new password'
              minLength={6}
              required
            />
          </div>

          <button
            type='submit'
            disabled={loading || resetCooldown.isCoolingDown}
            className='w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
          >
            {loading ? (
              <>
                <FaSpinner className='animate-spin mr-2' />
                Resetting...
              </>
            ) : (
              resetCooldown.isCoolingDown
                ? `Wait ${resetCooldown.remainingSeconds}s`
                : 'Reset Password'
            )}
          </button>

          <div className='text-center'>
            <Link to='/login' className='text-blue-600 hover:underline text-sm'>
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
