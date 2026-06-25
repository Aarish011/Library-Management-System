const AboutPage = () => {
  return (
    <div className='container mx-auto px-4 py-16 max-w-4xl'>
      <h1 className='text-3xl font-bold text-gray-800 mb-8'>About Us</h1>
      <div className='space-y-4 text-gray-600'>
        <p>
          Library Management System is a modern platform designed to help
          students find the perfect study space. We believe that a good
          environment is essential for effective learning.
        </p>
        <p>
          Our system allows students to book seats, manage subscriptions, and
          connect with a community of like-minded learners.
        </p>
        <div className='bg-blue-50 p-6 rounded-lg mt-8'>
          <h3 className='font-semibold text-blue-800'>Our Mission</h3>
          <p className='text-blue-700'>
            To provide every student with a comfortable, focused, and productive
            study environment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
