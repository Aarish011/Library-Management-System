import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Navbar — Library Management System (student frontend)
 *
 * Design language:
 *  - Ink navy surface (#11182B) with a warm amber accent (#F4B740),
 *    echoing a desk lamp in a reading room.
 *  - "Fraunces" for the wordmark, "Inter" for everything else.
 *  - Signature touch: a small pulsing amber dot on "Book Seat" — a nod
 *    to the real-time seat availability that powers the booking flow.
 *
 * Usage:
 *   <Navbar isAuthenticated={false} />                       // public navbar
 *   <Navbar isAuthenticated={true} user={{ name, avatarUrl }} unreadCount={3} onLogout={fn} />
 *
 * Routing is handled by react-router-dom <Link> components.
 */

const PUBLIC_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Plans', href: '/plans' },
  { label: 'About', href: '/about' },
  { label: 'Career', href: '/career' },
  { label: 'Contact', href: '/contact' },
];

const STUDENT_LINKS = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Book Seat', href: '/book-seat', live: true },
  { label: 'Subscription', href: '/subscription' },
  { label: 'Payments', href: '/payments' },
  { label: 'Raise issue', href: '/support' },
];

function Logo() {
  return (
    <Link
      to='/'
      className='flex items-center gap-2 group'
      aria-label='Library home'
    >
      <svg
        width='28'
        height='28'
        viewBox='0 0 28 28'
        fill='none'
        className='shrink-0'
      >
        <rect width='28' height='28' rx='6' fill='#1B2540' />
        <path
          d='M7 8.5C7 7.67157 7.67157 7 8.5 7H13V21H8.5C7.67157 21 7 20.3284 7 19.5V8.5Z'
          fill='#F4B740'
        />
        <path
          d='M15 7H19.5C20.3284 7 21 7.67157 21 8.5V19.5C21 20.3284 20.3284 21 19.5 21H15V7Z'
          fill='#7C8AAE'
        />
        <rect x='13' y='7' width='2' height='14' fill='#11182B' />
      </svg>
      <span className='fraunces text-[19px] leading-none text-[#EDEFF5] tracking-tight'>
        Bookshelf
      </span>
    </Link>
  );
}

function NavLink({ href, label, live, isActive }) {
  return (
    <Link
      to={href}
      className={`relative px-3 py-2 text-[14.5px] font-medium rounded-md transition-colors duration-150
        ${isActive ? 'text-[#F4B740]' : 'text-[#C7CCDC] hover:text-[#EDEFF5]'}
      `}
    >
      <span className='flex items-center gap-1.5'>
        {label}
        {live && (
          <span className='relative flex h-2 w-2'>
            <span className='absolute inline-flex h-full w-full rounded-full bg-[#F4B740] opacity-60 animate-ping' />
            <span className='relative inline-flex h-2 w-2 rounded-full bg-[#F4B740]' />
          </span>
        )}
      </span>
      {isActive && (
        <span className='absolute left-3 right-3 -bottom-[1px] h-[2px] rounded-full bg-[#F4B740]' />
      )}
    </Link>
  );
}

function NotificationBell({ unreadCount = 0 }) {
  return (
    <Link
      to='/notifications'
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      className='relative flex items-center justify-center h-9 w-9 rounded-full text-[#C7CCDC] hover:text-[#EDEFF5] hover:bg-white/5 transition-colors'
    >
      <svg
        width='19'
        height='19'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
      >
        <path
          d='M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M13.73 21a2 2 0 0 1-3.46 0'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
      {unreadCount > 0 && (
        <span className='absolute top-1 right-1 min-w-[16px] h-[16px] px-[3px] rounded-full bg-[#F4B740] text-[#412402] text-[10px] font-semibold flex items-center justify-center'>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initials = (user?.name || 'S')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className='relative' ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup='true'
        aria-expanded={open}
        className='flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-white/5 transition-colors'
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=''
            className='h-8 w-8 rounded-full object-cover'
          />
        ) : (
          <span className='h-8 w-8 rounded-full bg-[#2A3559] text-[#F4B740] text-[12px] font-semibold flex items-center justify-center'>
            {initials}
          </span>
        )}
        <svg
          width='14'
          height='14'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          className={`text-[#7C8AAE] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path d='M6 9l6 6 6-6' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
      </button>

      {open && (
        <div
          role='menu'
          className='absolute right-0 mt-2 w-52 rounded-lg border border-white/10 bg-[#1B2540] shadow-lg py-1.5 z-50'
        >
          <div className='px-3.5 py-2 border-b border-white/10 mb-1'>
            <p className='text-[13.5px] font-medium text-[#EDEFF5] truncate'>
              {user?.name || 'Student'}
            </p>
            <p className='text-[12px] text-[#7C8AAE] truncate'>{user?.email}</p>
          </div>
          <Link
            to='/profile'
            role='menuitem'
            className='flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] text-[#C7CCDC] hover:bg-white/5 hover:text-[#EDEFF5]'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
            >
              <circle cx='12' cy='8' r='4' />
              <path d='M4 21c0-4 4-6 8-6s8 2 8 6' strokeLinecap='round' />
            </svg>
            My profile
          </Link>
          <Link
            to='/notifications'
            role='menuitem'
            className='flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] text-[#C7CCDC] hover:bg-white/5 hover:text-[#EDEFF5]'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
            >
              <path
                d='M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
            Notifications
          </Link>
          <Link
            to='/support'
            role='menuitem'
            className='flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] text-[#C7CCDC] hover:bg-white/5 hover:text-[#EDEFF5]'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
            >
              <path d='M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z' />
            </svg>
            Support
          </Link>
          <div className='border-t border-white/10 mt-1 pt-1'>
            <button
              onClick={onLogout}
              role='menuitem'
              className='w-full flex items-center gap-2.5 px-3.5 py-2 text-[13.5px] text-[#E8A2A2] hover:bg-white/5'
            >
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
              >
                <path
                  d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M16 17l5-5-5-5M21 12H9'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Main Navbar component - uses useLocation() directly
export default function Navbar({
  isAuthenticated = false,
  user = { name: 'Asha Mehta', email: 'asha@bookshelf.app' },
  unreadCount = 0,
  onLogout = () => {},
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const links = isAuthenticated ? STUDENT_LINKS : PUBLIC_LINKS;
  const closeMobileMenu = () => setMobileOpen(false);

  // ✅ Get current path from React Router
  const currentPath = location.pathname;

  // ✅ Check if a link is active
  const isLinkActive = (href) => {
    // For home page, exact match only (prevents "/" from matching everything)
    if (href === '/') {
      return currentPath === '/';
    }
    // For other pages, use startsWith for nested routes
    return currentPath.startsWith(href);
  };

  // ✅ Get active class for mobile menu
  const getMobileActiveClass = (href) => {
    const isActive = isLinkActive(href);
    return isActive
      ? 'text-[#F4B740] bg-white/5'
      : 'text-[#C7CCDC] hover:bg-white/5';
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [isAuthenticated]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header className='sticky top-0 z-50 bg-[#11182B]/95 backdrop-blur-sm border-b border-white/10'>
      <nav
        className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between'
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Logo />

        {/* Center nav — desktop */}
        <div className='hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2'>
          {links.map((l) => (
            <NavLink key={l.href} {...l} isActive={isLinkActive(l.href)} />
          ))}
        </div>

        {/* Right side — desktop */}
        <div className='hidden md:flex items-center gap-2'>
          {isAuthenticated ? (
            <>
              <NotificationBell unreadCount={unreadCount} />
              <span className='w-px h-6 bg-white/10 mx-1' />
              <ProfileMenu user={user} onLogout={onLogout} />
            </>
          ) : (
            <>
              <Link
                to='/login'
                className='px-4 py-2 text-[14px] font-medium text-[#EDEFF5] hover:text-[#F4B740] transition-colors'
              >
                Login
              </Link>
              <Link
                to='/register'
                className='px-4 py-2 text-[14px] font-semibold bg-[#F4B740] text-[#412402] rounded-md hover:bg-[#FAC775] transition-colors'
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Hamburger — mobile */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label='Toggle menu'
          aria-expanded={mobileOpen}
          className='md:hidden flex items-center justify-center h-10 w-10 rounded-md text-[#EDEFF5] hover:bg-white/5'
        >
          <svg
            width='22'
            height='22'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            {mobileOpen ? (
              <path
                d='M6 6l12 12M6 18L18 6'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            ) : (
              <path
                d='M4 7h16M4 12h16M4 17h16'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out border-t border-white/10 ${
          mobileOpen ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className='px-4 py-3 flex flex-col gap-1 bg-[#11182B]'>
          {links.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              onClick={closeMobileMenu}
              className={`flex items-center justify-between px-3 py-2.5 rounded-md text-[15px] font-medium ${getMobileActiveClass(
                l.href
              )}`}
            >
              {l.label}
              {l.live && <span className='h-2 w-2 rounded-full bg-[#F4B740]' />}
            </Link>
          ))}

          <div className='h-px bg-white/10 my-2' />

          {isAuthenticated ? (
            <>
              <Link
                to='/notifications'
                onClick={closeMobileMenu}
                className='flex items-center justify-between px-3 py-2.5 rounded-md text-[15px] font-medium text-[#C7CCDC] hover:bg-white/5'
              >
                Notifications
                {unreadCount > 0 && (
                  <span className='min-w-[18px] h-[18px] px-1 rounded-full bg-[#F4B740] text-[#412402] text-[11px] font-semibold flex items-center justify-center'>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link
                to='/profile'
                onClick={closeMobileMenu}
                className='px-3 py-2.5 rounded-md text-[15px] font-medium text-[#C7CCDC] hover:bg-white/5'
              >
                My profile
              </Link>
              <Link
                to='/support'
                onClick={closeMobileMenu}
                className='px-3 py-2.5 rounded-md text-[15px] font-medium text-[#C7CCDC] hover:bg-white/5'
              >
                Support
              </Link>
              <button
                onClick={() => {
                  closeMobileMenu();
                  onLogout();
                }}
                className='text-left px-3 py-2.5 rounded-md text-[15px] font-medium text-[#E8A2A2] hover:bg-white/5'
              >
                Logout
              </button>
            </>
          ) : (
            <div className='flex flex-col gap-2 pt-1'>
              <Link
                to='/login'
                onClick={closeMobileMenu}
                className='text-center px-4 py-2.5 rounded-md text-[15px] font-medium text-[#EDEFF5] border border-white/15 hover:bg-white/5'
              >
                Login
              </Link>
              <Link
                to='/register'
                onClick={closeMobileMenu}
                className='text-center px-4 py-2.5 rounded-md text-[15px] font-semibold bg-[#F4B740] text-[#412402] hover:bg-[#FAC775]'
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
