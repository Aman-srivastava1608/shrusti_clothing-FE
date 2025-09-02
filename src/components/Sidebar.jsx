import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaIndustry,
  FaCogs,
  FaTshirt,
  FaUsers,
  FaCut,
  FaMoneyBillWave,
  FaWallet,
  FaUserTie,
} from 'react-icons/fa';

const sidebarLinks = [
  { label: 'Dashboard', path: '/admin', icon: <FaTachometerAlt /> },
  { label: 'Add Fabric', path: '/admin/fabric/add', icon: <FaIndustry /> },
  { label: 'View Fabric', path: '/admin/fabric/view', icon: <FaIndustry /> },
  { label: 'Add Product', path: '/admin/product/add', icon: <FaTshirt /> },
  { label: 'Add Staff', path: '/admin/staff/add', icon: <FaUsers /> },
  { label: 'Add Cutting', path: '/admin/cutting/add', icon: <FaCut /> },
  { label: 'Add Advance Pay', path: '/admin/advance/add', icon: <FaMoneyBillWave /> },
  { label: 'Add Wages', path: '/admin/wages/add', icon: <FaWallet /> },
  { label: 'Add Job Worker', path: '/admin/jobworker/add', icon: <FaUserTie /> },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-64 bg-black text-white h-screen p-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">SHRUSTI</h1>
        <p className="text-sm tracking-wide">CLOTHING</p>
      </div>
      <nav className="space-y-2">
        {sidebarLinks.map((link, index) => (
          <div
            key={index}
            onClick={() => navigate(link.path)}
            className={`flex items-center space-x-3 p-2 rounded cursor-pointer ${
              location.pathname === link.path ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
