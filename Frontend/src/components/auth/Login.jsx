import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { login as loginApi } from '../../api/authApi';
import toast from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';
import useActionCooldown from '../../hooks/useActionCooldown';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const emailLoginCooldown = useActionCooldown(3000);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !emailLoginCooldown.guard((seconds) =>
        toast.error(`Please wait ${seconds}s before trying again`)
      )
    ) {
      return;
    }

    // Basic validation
    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!formData.password) {
      setErrors({ password: 'Password is required' });
      return;
    }

    setLoading(true);
    setAuthError('');
    emailLoginCooldown.startCooldown();
    try {
      const response = await loginApi({
        email: formData.email,
        password: formData.password,
      });

      if (response.success) {
        login(response.data.user, response.data.token);
        toast.success('Welcome back! 👋');
        navigate('/dashboard');
      }
    } catch (error) {
      const message = error.message || 'Login failed';
      setAuthError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-start sm:items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-3 sm:py-12 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full bg-white rounded-xl shadow-lg p-5 sm:p-8'>
        <div className='text-center mb-6 sm:mb-8'>
          <h2 className='text-2xl sm:text-3xl font-bold text-gray-800'>Welcome Back</h2>
          <p className='text-gray-500 mt-2'>Login to your account</p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-5'>
          {authError && (
            <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
              {authError}
            </div>
          )}

          {/* Email */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Email *
            </label>
            <input
              type='email'
              name='email'
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder='john@example.com'
            />
            {errors.email && (
              <p className='text-red-500 text-sm mt-1'>{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Password *
            </label>
            <input
              type='password'
              name='password'
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder='Enter your password'
            />
            {errors.password && (
              <p className='text-red-500 text-sm mt-1'>{errors.password}</p>
            )}
          </div>

          {/* Forgot Password */}
          <div className='text-right'>
            <Link
              to='/forgot-password'
              className='text-sm text-blue-600 hover:underline'
            >
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type='submit'
            disabled={loading || emailLoginCooldown.isCoolingDown}
            className='w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
          >
            {loading ? (
              <>
                <FaSpinner className='animate-spin mr-2' />
                Logging in...
              </>
            ) : (
              emailLoginCooldown.isCoolingDown
                ? `Wait ${emailLoginCooldown.remainingSeconds}s`
                : 'Login'
            )}
          </button>
        </form>

        <div className='text-center mt-6'>
          <p className='text-gray-600'>
            Don't have an account?{' '}
            <Link
              to='/register'
              className='text-blue-600 hover:underline font-medium'
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
