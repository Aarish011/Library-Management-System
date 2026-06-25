import React from 'react';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className='bg-[#11182B] text-gray-300 border-t border-white/10'>
      <div className='max-w-7xl mx-auto px-6 py-14'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10'>
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

            <ul className='space-y-3'>
              <li>
                <Link to='/' className='hover:text-[#F4B740] transition'>
                  Home
                </Link>
              </li>

              <li>
                <Link to='/plans' className='hover:text-[#F4B740] transition'>
                  Plans
                </Link>
              </li>

              <li>
                <Link to='/about' className='hover:text-[#F4B740] transition'>
                  About
                </Link>
              </li>

              <li>
                <Link to='/contact' className='hover:text-[#F4B740] transition'>
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

            <ul className='space-y-3'>
              <li>
                <Link
                  to='/dashboard'
                  className='hover:text-[#F4B740] transition'
                >
                  Dashboard
                </Link>
              </li>

              <li>
                <Link
                  to='/book-seat'
                  className='hover:text-[#F4B740] transition'
                >
                  Book Seat
                </Link>
              </li>

              <li>
                <Link
                  to='/subscription'
                  className='hover:text-[#F4B740] transition'
                >
                  Membership
                </Link>
              </li>

              <li>
                <Link
                  to='/payments'
                  className='hover:text-[#F4B740] transition'
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

            <ul className='space-y-3'>
              <li>
                <Link to='/faq' className='hover:text-[#F4B740] transition'>
                  FAQ
                </Link>
              </li>

              <li>
                <Link
                  to='/privacy-policy'
                  className='hover:text-[#F4B740] transition'
                >
                  Privacy Policy
                </Link>
              </li>

              <li>
                <Link to='/terms' className='hover:text-[#F4B740] transition'>
                  Terms & Conditions
                </Link>
              </li>

              <li>
                <Link to='/help' className='hover:text-[#F4B740] transition'>
                  Help Center
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Section */}
        <div className='mt-12 flex flex-col items-center'>
          <h3 className='text-[#F4B740] font-semibold mb-5'>Connect With Us</h3>

          <div className='flex gap-4'>
            <a
              href='#'
              className='h-11 w-11 rounded-full bg-[#1B2540] flex items-center justify-center hover:bg-[#F4B740] hover:text-black transition-all duration-300'
            >
              <FaFacebookF />
            </a>

            <a
              href='#'
              className='h-11 w-11 rounded-full bg-[#1B2540] flex items-center justify-center hover:bg-[#F4B740] hover:text-black transition-all duration-300'
            >
              <FaInstagram />
            </a>

            <a
              href='#'
              className='h-11 w-11 rounded-full bg-[#1B2540] flex items-center justify-center hover:bg-[#F4B740] hover:text-black transition-all duration-300'
            >
              <FaLinkedinIn />
            </a>

            <a
              href='#'
              className='h-11 w-11 rounded-full bg-[#1B2540] flex items-center justify-center hover:bg-[#F4B740] hover:text-black transition-all duration-300'
            >
              <FaWhatsapp />
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className='border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400'>
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
