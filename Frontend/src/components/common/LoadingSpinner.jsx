import { FaSpinner } from 'react-icons/fa';

const LoadingSpinner = () => {
  return (
    <div className='flex items-center justify-center min-h-screen'>
      <FaSpinner className='text-4xl text-blue-600 animate-spin' />
    </div>
  );
};

export default LoadingSpinner;
