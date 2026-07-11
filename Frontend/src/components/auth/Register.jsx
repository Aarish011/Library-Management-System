import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { register } from '../../api/authApi';
import { validateRegister } from '../../utils/validators';
import toast from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';
import useActionCooldown from '../../hooks/useActionCooldown';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import {
  firebaseAuth,
  isFirebasePhoneAuthConfigured,
} from '../../config/firebase';
import InstitutePolicyNotice from '../common/InstitutePolicyNotice';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const recaptchaVerifierRef = useRef(null);
  const registerCooldown = useActionCooldown(5000);
  const otpSendCooldown = useActionCooldown(60000);
  const otpVerifyCooldown = useActionCooldown(5000);
  const [loading, setLoading] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [firebaseIdToken, setFirebaseIdToken] = useState('');
  const [submitError, setSubmitError] = useState('');
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
    const nextValue =
      name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    setSubmitError('');
    if (name === 'phone') {
      setPhoneVerified(false);
      setFirebaseIdToken('');
      setConfirmationResult(null);
      setOtp('');
    }
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const clearRecaptcha = () => {
    try {
      recaptchaVerifierRef.current?.clear?.();
    } catch (error) {
      console.warn('Could not clear Firebase reCAPTCHA:', error);
    }
    recaptchaVerifierRef.current = null;

    const container = document.getElementById('register-phone-recaptcha');
    if (container) container.innerHTML = '';
  };

  useEffect(() => () => clearRecaptcha(), []);

  const setupRecaptcha = async () => {
    if (!firebaseAuth) {
      throw new Error('Firebase phone verification is not configured yet');
    }

    clearRecaptcha();
    firebaseAuth.useDeviceLanguage();

    const verifier = new RecaptchaVerifier(
      firebaseAuth,
      'register-phone-recaptcha',
      {
        size: 'normal',
        callback: () => {},
        'expired-callback': () => {
          clearRecaptcha();
          setConfirmationResult(null);
          toast.error('reCAPTCHA expired. Please request OTP again.');
        },
      }
    );

    recaptchaVerifierRef.current = verifier;
    await verifier.render();
    return verifier;
  };

  const handleSendOtp = async () => {
    if (
      !otpSendCooldown.guard((seconds) =>
        toast.error(`Please wait ${seconds}s before requesting another OTP`)
      )
    ) {
      return;
    }

    if (formData.phone.length !== 10) {
      setErrors((prev) => ({
        ...prev,
        phone: 'Please enter a valid 10-digit phone number',
      }));
      return;
    }

    setPhoneVerifying(true);
    try {
      setConfirmationResult(null);
      setOtp('');
      setPhoneVerified(false);
      setFirebaseIdToken('');
      const verifier = await setupRecaptcha();
      const result = await signInWithPhoneNumber(
        firebaseAuth,
        `+91${formData.phone}`,
        verifier
      );
      setConfirmationResult(result);
      otpSendCooldown.startCooldown();
      toast.success('OTP sent to your phone');
    } catch (error) {
      console.error('Send registration OTP error:', error);
      clearRecaptcha();
      otpSendCooldown.resetCooldown();
      toast.error(getFirebasePhoneErrorMessage(error));
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (
      !otpVerifyCooldown.guard((seconds) =>
        toast.error(`Please wait ${seconds}s before verifying again`)
      )
    ) {
      return;
    }

    if (!confirmationResult) {
      toast.error('Please request an OTP first');
      return;
    }

    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setPhoneVerifying(true);
    otpVerifyCooldown.startCooldown();
    try {
      const credential = await confirmationResult.confirm(otp);
      const idToken = await credential.user.getIdToken(true);
      setFirebaseIdToken(idToken);
      setPhoneVerified(true);
      setConfirmationResult(null);
      clearRecaptcha();
      toast.success('Phone number verified');
    } catch (error) {
      console.error('Verify registration OTP error:', error);
      toast.error(error.message || 'Could not verify OTP');
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !registerCooldown.guard((seconds) =>
        toast.error(`Please wait ${seconds}s before trying again`)
      )
    ) {
      return;
    }

    // Validate
    const validationErrors = validateRegister(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fix the errors');
      return;
    }

    if (!phoneVerified || !firebaseIdToken) {
      setErrors((prev) => ({
        ...prev,
        phone: 'Please verify your phone number before registration',
      }));
      toast.error('Please verify your phone number first');
      return;
    }

    setLoading(true);
    setSubmitError('');
    registerCooldown.startCooldown();
    try {
      const response = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        gender: formData.gender.toLowerCase(),
        preparation: formData.preparation,
        firebaseIdToken,
      });

      if (response.success) {
        login(response.data.user, response.data.token);
        toast.success('Registration successful! 🎉');
        navigate('/dashboard');
      }
    } catch (error) {
      const message = error.message || 'Registration failed';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-start sm:items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-3 sm:py-12 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full bg-white rounded-xl shadow-lg p-5 sm:p-8'>
        <div className='text-center mb-6 sm:mb-8'>
          <h2 className='text-2xl sm:text-3xl font-bold text-gray-800'>Create Account</h2>
          <p className='text-gray-500 mt-2'>Join the library community</p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-5'>
          {submitError && (
            <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
              {submitError}
            </div>
          )}

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
            {phoneVerified && (
              <p className='text-emerald-600 text-sm mt-1'>
                Phone number verified
              </p>
            )}
            {!isFirebasePhoneAuthConfigured ? (
              <div className='mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
                Phone verification is waiting for Firebase configuration.
              </div>
            ) : (
              <div className='mt-3 space-y-3'>
                <div id='register-phone-recaptcha' />
                <button
                  type='button'
                  onClick={handleSendOtp}
                  disabled={
                    phoneVerifying ||
                    phoneVerified ||
                    otpSendCooldown.isCoolingDown
                  }
                  className='w-full border border-blue-600 text-blue-700 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
                >
                  {phoneVerifying && !confirmationResult ? (
                    <>
                      <FaSpinner className='animate-spin mr-2' />
                      Sending OTP...
                    </>
                  ) : phoneVerified ? (
                    'Phone verified'
                  ) : otpSendCooldown.isCoolingDown ? (
                    `Resend in ${otpSendCooldown.remainingSeconds}s`
                  ) : (
                    'Send OTP'
                  )}
                </button>

                {confirmationResult && !phoneVerified && (
                  <div className='space-y-3'>
                    <input
                      type='text'
                      value={otp}
                      onChange={(event) =>
                        setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition'
                      placeholder='Enter 6-digit OTP'
                      inputMode='numeric'
                      pattern='[0-9]{6}'
                    />
                    <button
                      type='button'
                      onClick={handleVerifyOtp}
                      disabled={phoneVerifying || otpVerifyCooldown.isCoolingDown}
                      className='w-full bg-[#11182B] text-white py-2.5 rounded-lg font-semibold hover:bg-[#1B2540] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
                    >
                      {phoneVerifying ? (
                        <>
                          <FaSpinner className='animate-spin mr-2' />
                          Verifying...
                        </>
                      ) : otpVerifyCooldown.isCoolingDown ? (
                        `Wait ${otpVerifyCooldown.remainingSeconds}s`
                      ) : (
                        'Verify OTP'
                      )}
                    </button>
                  </div>
                )}
              </div>
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

          <InstitutePolicyNotice />

          {/* Submit Button */}
          <button
            type='submit'
            disabled={
              loading ||
              registerCooldown.isCoolingDown ||
              !phoneVerified ||
              !firebaseIdToken
            }
            className='w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
          >
            {loading ? (
              <>
                <FaSpinner className='animate-spin mr-2' />
                Creating Account...
              </>
            ) : (
              !phoneVerified
                ? 'Verify phone first'
                : registerCooldown.isCoolingDown
                ? `Wait ${registerCooldown.remainingSeconds}s`
                : 'Create Account'
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

function getFirebasePhoneErrorMessage(error) {
  const code = error?.code || '';

  if (code === 'auth/invalid-app-credential') {
    return 'Firebase could not verify this browser. Add this site address in Firebase Authentication authorized domains, then try again.';
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Phone verification is not enabled for this Firebase project or this SMS region.';
  }

  if (code === 'auth/billing-not-enabled') {
    return 'Firebase billing must be enabled before SMS can be sent.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Too many OTP attempts. Please wait before requesting another code.';
  }

  if (code === 'auth/invalid-phone-number') {
    return 'Please enter a valid phone number.';
  }

  if (code === 'auth/quota-exceeded') {
    return 'Firebase SMS quota is exhausted. Please try again later.';
  }

  if (code === 'auth/captcha-check-failed') {
    return 'reCAPTCHA verification failed. Please refresh the page and try again.';
  }

  return error?.message || 'Could not send OTP. Please try again.';
}

export default Register;
