import React from 'react';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import InstitutePolicyNotice from './InstitutePolicyNotice';

const Footer = () => {
  return (
    <footer className='bg-[#11182B] text-gray-300 border-t border-white/10'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10'>
          {/* Brand */}
          <div className='lg:col-span-2'>
            <h2 className='text-3xl font-bold text-white mb-4'>
              <span className='text-[#F4B740]'>Book</span>shelf
            </h2>

            <p className='text-sm leading-7 text-gray-400 mb-5'>
              Providing a quiet and productive study environment with
              comfortable seating, secure access, and flexible membership plans.
            </p>

            <div className='space-y-2 text-sm'>
              <p>📍 Greater Noida, Uttar Pradesh</p>
              <p>📞 +91 98765 43210</p>
              <p>✉️ support@bookshelf.com</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className='text-[#F4B740] font-semibold text-lg mb-4'>
              Quick Links
            </h3>

            <ul className='space-y-1'>
              <li>
                <Link to='/' className='block py-2 hover:text-[#F4B740] transition'>
                  Home
                </Link>
              </li>

              <li>
                <Link to='/plans' className='block py-2 hover:text-[#F4B740] transition'>
                  Plans
                </Link>
              </li>

              <li>
                <Link to='/about' className='block py-2 hover:text-[#F4B740] transition'>
                  About
                </Link>
              </li>

              <li>
                <Link to='/career' className='block py-2 hover:text-[#F4B740] transition'>
                  Career
                </Link>
              </li>

              <li>
                <Link to='/contact' className='block py-2 hover:text-[#F4B740] transition'>
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Student Services */}
          <div>
            <h3 className='text-[#F4B740] font-semibold text-lg mb-4'>
              Student Services
            </h3>

            <ul className='space-y-1'>
              <li>
                <Link
                  to='/dashboard'
                  className='block py-2 hover:text-[#F4B740] transition'
                >
                  Dashboard
                </Link>
              </li>

              <li>
                <Link
                  to='/book-seat'
                  className='block py-2 hover:text-[#F4B740] transition'
                >
                  Book Seat
                </Link>
              </li>

              <li>
                <Link
                  to='/subscription'
                  className='block py-2 hover:text-[#F4B740] transition'
                >
                  Membership
                </Link>
              </li>

              <li>
                <Link
                  to='/payments'
                  className='block py-2 hover:text-[#F4B740] transition'
                >
                  Payments
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className='text-[#F4B740] font-semibold text-lg mb-4'>
              Support
            </h3>

            <ul className='space-y-1'>
              <li>
                <Link to='/support' className='block py-2 hover:text-[#F4B740] transition'>
                  Raise an Issue
                </Link>
              </li>

              <li>
                <Link
                  to='/notifications'
                  className='block py-2 hover:text-[#F4B740] transition'
                >
                  Notifications
                </Link>
              </li>

              <li>
                <Link to='/profile' className='block py-2 hover:text-[#F4B740] transition'>
                  My Profile
                </Link>
              </li>

              <li>
                <Link to='/contact' className='block py-2 hover:text-[#F4B740] transition'>
                  Contact Desk
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Section */}
        <div className='mt-12 flex flex-col items-center'>
          <h3 className='text-[#F4B740] font-semibold mb-5'>Connect With Us</h3>

          <div className='flex gap-4'>
            <button
              type='button'
              aria-label='Facebook page coming soon'
              title='Facebook page coming soon'
              className='h-11 w-11 rounded-full bg-[#1B2540] flex items-center justify-center hover:bg-[#F4B740] hover:text-black transition-all duration-300'
            >
              <FaFacebookF />
            </button>

            <button
              type='button'
              aria-label='Instagram page coming soon'
              title='Instagram page coming soon'
              className='h-11 w-11 rounded-full bg-[#1B2540] flex items-center justify-center hover:bg-[#F4B740] hover:text-black transition-all duration-300'
            >
              <FaInstagram />
            </button>

            <button
              type='button'
              aria-label='LinkedIn page coming soon'
              title='LinkedIn page coming soon'
              className='h-11 w-11 rounded-full bg-[#1B2540] flex items-center justify-center hover:bg-[#F4B740] hover:text-black transition-all duration-300'
            >
              <FaLinkedinIn />
            </button>

            <a
              href='https://wa.me/919876543210'
              target='_blank'
              rel='noreferrer'
              aria-label='Contact Bookshelf on WhatsApp'
              className='h-11 w-11 rounded-full bg-[#1B2540] flex items-center justify-center hover:bg-[#F4B740] hover:text-black transition-all duration-300'
            >
              <FaWhatsapp />
            </a>
          </div>
        </div>

        <InstitutePolicyNotice className='mt-10 sm:mt-12' compact variant='dark' />

        {/* Bottom Bar */}
        <div className='border-t border-white/10 mt-10 sm:mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400 text-center md:text-left'>
          <p>
            © {new Date().getFullYear()} Bookshelf Library. All rights reserved.
          </p>

          <p>Built for focused learning and academic excellence.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
