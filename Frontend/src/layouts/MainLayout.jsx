import { Outlet } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

const MainLayout = () => {
  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      <Header />
      <main className='flex-1 container mx-auto px-4 py-8'>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
