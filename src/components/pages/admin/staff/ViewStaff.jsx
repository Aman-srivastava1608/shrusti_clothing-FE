import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// CSS for react-toastify ko inline style mein daalein
const toastifyCSS = `
.Toastify__toast-container {
  z-index: 9999;
}
.Toastify__toast--success {
  background-color: #d1e4d6ff;
}
.Toastify__toast--error {
  background-color: #dc3545;
}
`;

// Inline SVG Icons
const DeleteIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-4 h-4"
  >
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

const ViewStaff = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/staff`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("branchToken")}` },
      });
      setStaffList(res.data || []);
    } catch (err) {
      console.error("Error fetching staff:", err);
      toast.error("Error fetching staff data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (staffId) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      try {
        // Corrected line below:
        await axios.delete(`${apiBaseUrl}/api/staff/${staffId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("branchToken")}` },
        });
        toast.success("Staff deleted successfully.");
        fetchStaff(); // Refresh the list after deletion
      } catch (err) {
        console.error("Error deleting staff:", err);
        toast.error("Failed to delete staff.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading staff data...</p>
      </div>
    );
  }

  return (
    <>
      <style>{toastifyCSS}</style>
      <div className="p-5">
        <h2 className="text-2xl font-bold mb-5">View All Staff</h2>

        <button
          onClick={() => navigate(`/admin/dashboard/staff/add`)}
          className="mb-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New Staff
        </button>

        {staffList.length === 0 ? (
          <p>No staff found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border px-3 py-2 text-left">S.No.</th>
                  <th className="border px-3 py-2 text-left">Staff Name</th>
                  <th className="border px-3 py-2 text-left">Operation Name</th>
                  <th className="border px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff, idx) => (
                  <tr key={staff.id} className="hover:bg-gray-100">
                    <td className="border px-3 py-2">{idx + 1}</td>
                    <td className="border px-3 py-2">{staff.full_name}</td>
                    <td className="border px-3 py-2">{staff.operation}</td>
                    <td className="border px-3 py-2 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => handleDelete(staff.id)}
                          className="flex justify-center items-center text-red-600 hover:text-red-800 p-1 rounded"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ToastContainer />
      </div>
    </>
  );
};

export default ViewStaff;