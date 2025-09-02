import React, { useState } from "react";
import axios from "axios";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export default function AddBranch() {
  const [formData, setFormData] = useState({
    branchName: "",
    branchAddress: "",
    gst: "",
    mobile: "",
    confirmMobile: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.mobile !== formData.confirmMobile) {
      alert("Mobile numbers do not match");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      // API call to backend with correct field names for the backend
      const res = await axios.post(
        `${apiBaseUrl}/api/branches/create`,
        {
          // Backend ke hisaab se names
          branch_name: formData.branchName,
          address: formData.branchAddress,
          gst_number: formData.gst,
          mobile_number: formData.mobile,
          admin_username: formData.email, // backend is expecting 'admin_username'
          admin_password: formData.password, // backend is expecting 'admin_password'
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      alert(res.data.message || "Branch added successfully!");
      setFormData({
        branchName: "",
        branchAddress: "",
        gst: "",
        mobile: "",
        confirmMobile: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error adding branch");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-xl">
      <h1 className="text-2xl font-bold mb-6">Add Branch</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Branch Name</label>
          <input
            type="text"
            name="branchName"
            value={formData.branchName}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>
        <div>
          <label className="block font-medium">Branch Address</label>
          <textarea
            name="branchAddress"
            value={formData.branchAddress}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          ></textarea>
        </div>
        <div>
          <label className="block font-medium">GST Number</label>
          <input
            type="text"
            name="gst"
            value={formData.gst}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block font-medium">Mobile Number</label>
          <input
            type="tel"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>
        <div>
          <label className="block font-medium">Confirm Mobile Number</label>
          <input
            type="tel"
            name="confirmMobile"
            value={formData.confirmMobile}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>
        <div>
          <label className="block font-medium">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>
        <div>
          <label className="block font-medium">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>
        <div>
          <label className="block font-medium">Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-semibold"
        >
          Add Branch
        </button>
      </form>
    </div>
  );
}
