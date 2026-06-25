const plans = [
  {
    name: 'Library Access',
    price: 'Rs. 1250',
    duration: '30 Days',
    features: ['Full library access', 'Seat not reserved', 'WiFi', 'AC', 'Charging', 'Optional refundable locker: Rs. 250'],
  },
  {
    name: 'Library Access + Reserved Seat',
    price: 'Rs. 1500',
    duration: '30 Days',
    features: ['Full library access', 'Selected seat reserved after payment', 'WiFi', 'AC', 'Charging', 'Optional refundable locker: Rs. 250'],
  },
];

const PlansPage = () => {
  return (
    <div className='container mx-auto px-4 py-16'>
      <h1 className='text-3xl font-bold text-center text-gray-800 mb-12'>
        Library Fee Packages
      </h1>
      <div className='grid md:grid-cols-2 gap-8 max-w-5xl mx-auto'>
        {plans.map((plan, index) => (
          <div
            key={index}
            className='bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition'
          >
            <h3 className='text-xl font-bold text-gray-800'>{plan.name}</h3>
            <p className='text-3xl font-bold text-blue-600 my-4'>
              {plan.price}
            </p>
            <p className='text-gray-500 text-sm'>{plan.duration}</p>
            <ul className='mt-4 space-y-2'>
              {plan.features.map((feature, i) => (
                <li key={i} className='text-gray-600'>
                  {feature}
                </li>
              ))}
            </ul>
            <button className='mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition'>
              Get Started
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlansPage;
