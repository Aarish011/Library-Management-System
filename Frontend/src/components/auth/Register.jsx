import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { register } from '../../api/authApi';
import { validateRegister } from '../../utils/validators';
import toast from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: '',
    preparation: '',
  });
  const [errors, setErrors] = useState({});

  const preparationOptions = [
    'UPSC',
    'JEE',
    'GATE',
    'NEET',
    'CAT',
    'Banking',
    'SSC',
    'Other',
  ];
  const genderOptions = ['Male', 'Female', 'Other'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const validationErrors = validateRegister(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fix the errors');
      return;
    }

    setLoading(true);
    try {
      const response = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        gender: formData.gender.toLowerCase(),
        preparation: formData.preparation,
      });

      if (response.success) {
        login(response.data.user, response.data.token);
        toast.success('Registration successful! 🎉');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full bg-white rounded-xl shadow-lg p-8'>
        <div className='text-center mb-8'>
          <h2 className='text-3xl font-bold text-gray-800'>Create Account</h2>
          <p className='text-gray-500 mt-2'>Join the library community</p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-5'>
          {/* Name */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Full Name *
            </label>
            <input
              type='text'
              name='name'
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder='John Doe'
            />
            {errors.name && (
              <p className='text-red-500 text-sm mt-1'>{errors.name}</p>
            )}
          </div>

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

          {/* Phone */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Phone Number *
            </label>
            <input
              type='tel'
              name='phone'
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder='9876543210'
            />
            {errors.phone && (
              <p className='text-red-500 text-sm mt-1'>{errors.phone}</p>
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
              placeholder='Min 6 characters'
            />
            {errors.password && (
              <p className='text-red-500 text-sm mt-1'>{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Confirm Password *
            </label>
            <input
              type='password'
              name='confirmPassword'
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder='Confirm your password'
            />
            {errors.confirmPassword && (
              <p className='text-red-500 text-sm mt-1'>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Gender *
            </label>
            <select
              name='gender'
              value={formData.gender}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.gender ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value=''>Select Gender</option>
              {genderOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.gender && (
              <p className='text-red-500 text-sm mt-1'>{errors.gender}</p>
            )}
          </div>

          {/* Preparation */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              What are you preparing for? *
            </label>
            <select
              name='preparation'
              value={formData.preparation}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.preparation ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value=''>Select Preparation</option>
              {preparationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.preparation && (
              <p className='text-red-500 text-sm mt-1'>{errors.preparation}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
          >
            {loading ? (
              <>
                <FaSpinner className='animate-spin mr-2' />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className='text-center mt-6'>
          <p className='text-gray-600'>
            Already have an account?{' '}
            <Link
              to='/login'
              className='text-blue-600 hover:underline font-medium'
            >
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
