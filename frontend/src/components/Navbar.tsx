import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-blue-600">
              UniRide
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/rides" className="text-gray-700 hover:text-blue-600">Find Ride</Link>
            <Link to="/create-ride" className="text-gray-700 hover:text-blue-600">Publish Ride</Link>
            <Link to="/profile" className="text-gray-700 hover:text-blue-600">Profile</Link>
            <Link to="/register" className="text-gray-700 hover:text-blue-600">Register</Link>
            <Link to="/login" className="btn btn-primary">Login</Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700 hover:text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-100">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col">
            <Link to="/rides" className="block px-3 py-2 text-gray-700 hover:bg-gray-50">Find Ride</Link>
            <Link to="/create-ride" className="block px-3 py-2 text-gray-700 hover:bg-gray-50">Publish Ride</Link>
            <Link to="/profile" className="block px-3 py-2 text-gray-700 hover:bg-gray-50">Profile</Link>
            <Link to="/register" className="block px-3 py-2 text-gray-700 hover:bg-gray-50">Register</Link>
            <Link to="/login" className="block px-3 py-2 text-blue-600 font-bold hover:bg-gray-50">Login</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
