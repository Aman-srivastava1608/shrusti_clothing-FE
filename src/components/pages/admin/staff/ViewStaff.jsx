import React, { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-4 h-4" viewBox="0 0 24 24">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM21.41 
    6.34c.39-.39.39-1.02 0-1.41l-2.34-2.34a1.003 
    1.003 0 00-1.42 0l-1.83 1.83 3.75 3.75 
    1.84-1.83z"/>
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-4 h-4" viewBox="0 0 24 24">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

const ViewStaff = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal states
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [operations, setOperations] = useState([]);

  useEffect(() => {
    fetchStaff();
    fetchOperations();
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

  const fetchOperations = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/staff/operations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("branchToken")}` },
      });
      setOperations(res.data || []);
    } catch (err) {
      console.error("Error fetching operations:", err);
      setOperations([]);
    }
  };

  const handleDelete = async (staffId) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      try {
        await axios.delete(`${apiBaseUrl}/api/staff/${staffId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("branchToken")}` },
        });
        toast.success("Staff deleted successfully.");
        fetchStaff();
      } catch (err) {
        console.error("Error deleting staff:", err);
        toast.error("Failed to delete staff.");
      }
    }
  };

  const handleEditClick = async (staffId) => {
    try {
      const res = await axios.get(`${apiBaseUrl}/api/staff/${staffId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("branchToken")}` },
      });
      setEditData(res.data);
      setShowModal(true);
    } catch (err) {
      console.error("Error fetching staff details:", err);
      toast.error("Failed to load staff details.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `${apiBaseUrl}/api/staff/${editData.id}`,
        editData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("branchToken")}` },
        }
      );
      toast.success("Staff updated successfully!");
      setShowModal(false);
      fetchStaff();
    } catch (err) {
      console.error("Error updating staff:", err);
      toast.error("Failed to update staff.");
    }
  };

  if (loading) return <p className="text-center">Loading staff data...</p>;

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold mb-5">View All Staff</h2>

      {staffList.length === 0 ? (
        <p>No staff found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-3 py-2">S.No.</th>
                <th className="border px-3 py-2">Staff Name</th>
                <th className="border px-3 py-2">Operation</th>
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
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEditClick(staff.id)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(staff.id)}
                        className="text-red-600 hover:text-red-800 p-1"
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

      {/* Edit Modal */}
      {showModal && editData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Edit Staff</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              
              {/* Full Name */}
              <div>
                <label className="block font-semibold">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={editData.full_name || ""}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>

              {/* Operation Dropdown */}
              <div>
                <label className="block font-semibold">Operation</label>
                <select
                  name="operation"
                  value={editData.operation || ""}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">-- Select Operation --</option>
                  {operations.map((op) => (
                    <option key={op.id} value={op.name}>
                      {op.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile */}
              <div>
                <label className="block font-semibold">Mobile</label>
                <input
                  type="text"
                  name="mobile_number"
                  value={editData.mobile_number || ""}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  maxLength={10}
                />
              </div>

              {/* Aadhaar */}
              <div>
                <label className="block font-semibold">Aadhaar Number</label>
                <input
                  type="text"
                  name="aadhar_number"
                  value={editData.aadhar_number || ""}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  maxLength={12}
                />
              </div>

              {/* PAN */}
              <div>
                <label className="block font-semibold">PAN Number</label>
                <input
                  type="text"
                  name="pan_number"
                  value={editData.pan_number || ""}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  maxLength={10}
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-400 text-white px-3 py-1 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default ViewStaff;
