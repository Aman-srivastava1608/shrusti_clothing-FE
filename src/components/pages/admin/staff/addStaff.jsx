import React, { useState, useEffect } from "react";
import axios from "axios";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const AddStaff = () => {
  const initialFormState = {
    fullName: "",
    operation: "",
    overlockOperator: "",
    flatlockOperator: "",
    aadharNumber: "",
    panNumber: "",
    mobileNumber: "",
    aadharFront: null,
    aadharBack: null,
    panCardImage: null,
    photo: null,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [resetKey, setResetKey] = useState(Date.now());
  const [operations, setOperations] = useState([]);
  const [singerOperationName, setSingerOperationName] = useState(null);
  const [overlockOperationName, setOverlockOperationName] = useState(null);
  const [overlockStaff, setOverlockStaff] = useState([]);
  const [flatlockStaff, setFlatlockStaff] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Fetch operations on initial load
  useEffect(() => {
    const fetchOperations = async () => {
      try {
        const res = await axios.get(`${apiBaseUrl}/api/operations`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("branchToken")}` },
        });

        setOperations(res.data);

        const singerOp = res.data.find(
          (op) => op.name.toLowerCase() === "singer"
        );
        const overlockOp = res.data.find(
          (op) => op.name.toLowerCase() === "overlock"
        );

        if (singerOp) setSingerOperationName(singerOp.name);
        if (overlockOp) setOverlockOperationName(overlockOp.name);
      } catch (err) {
        console.error("Error fetching operations:", err);
      }
    };
    fetchOperations();
  }, []);

  // Fetch staff based on selected operation
  useEffect(() => {
    const fetchRequiredStaff = async () => {
      // Fetch Flatlock staff only if 'Singer' or 'Overlock' is selected
      if (formData.operation === singerOperationName || formData.operation === overlockOperationName) {
        try {
          const flatlockRes = await axios.get(
            `${apiBaseUrl}/api/staff/by-operation/Flatlock`,
            { headers: { Authorization: `Bearer ${localStorage.getItem("branchToken")}` } }
          );
          setFlatlockStaff(flatlockRes.data);
        } catch (err) {
          console.error("Error fetching Flatlock staff:", err);
          setFlatlockStaff([]);
        }
      } else {
        setFlatlockStaff([]);
      }

      // Fetch Overlock staff only if 'Singer' is selected
      if (formData.operation === singerOperationName) {
        try {
          const overlockRes = await axios.get(
            `${apiBaseUrl}/api/staff/by-operation/Overlock`,
            { headers: { Authorization: `Bearer ${localStorage.getItem("branchToken")}` } }
          );
          setOverlockStaff(overlockRes.data);
        } catch (err) {
          console.error("Error fetching Overlock staff:", err);
          setOverlockStaff([]);
        }
      } else {
        setOverlockStaff([]);
      }
    };
    
    fetchRequiredStaff();
  }, [formData.operation, singerOperationName, overlockOperationName]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      const file = files[0];
      setFormData((prev) => ({ ...prev, [name]: file }));
      if (name === "photo") {
        setPhotoPreview(URL.createObjectURL(file));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Submit staff
  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSend = new FormData();
    
    for (const key in formData) {
      if (formData[key] instanceof File) {
        dataToSend.append(key, formData[key]);
      } else {
        dataToSend.append(key, formData[key] || ""); 
      }
    }

    try {
      await axios.post(`${apiBaseUrl}/api/staff/add`, dataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("branchToken")}`,
        },
      });

      alert("Staff Added Successfully");
      setFormData(initialFormState);
      setResetKey(Date.now());
      setPhotoPreview(null);
    } catch (err) {
      console.error("Error:", err);
      const errorMessage = err.response?.data?.error || "Failed to add staff";
      alert(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow p-8 rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-6 text-[#0071bc]">
            Add New Staff
          </h2>
          <form key={resetKey} onSubmit={handleSubmit} className="space-y-6">
            
            {/* Main Staff & Personal Details Section */}
            <div className="p-6 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Full Name & Operation */}
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block font-semibold">Staff Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full border p-2 rounded-md"
                    required
                  />
                </div>
                {/* Operation */}
                <div>
                  <label className="block font-semibold">Select Operation</label>
                  <select
                    name="operation"
                    value={formData.operation}
                    onChange={handleChange}
                    className="w-full border p-2 rounded-md"
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
              </div>

              {/* Column 2: Personal Info */}
              <div className="space-y-4">
                {/* Aadhaar */}
                <div>
                  <label className="block font-semibold">Aadhar Number</label>
                  <input
                    type="text"
                    name="aadharNumber"
                    value={formData.aadharNumber}
                    onChange={handleChange}
                    className="w-full border p-2 rounded-md"
                    maxLength={12}
                    pattern="[0-9]{12}"
                  />
                </div>
                {/* PAN */}
                <div>
                  <label className="block font-semibold">PAN Number</label>
                  <input
                    type="text"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleChange}
                    className="w-full border p-2 rounded-md"
                    maxLength={10}
                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                  />
                </div>
                {/* Mobile */}
                <div>
                  <label className="block font-semibold">Mobile Number</label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    className="w-full border p-2 rounded-md"
                    maxLength={10}
                    pattern="[0-9]{10}"
                  />
                </div>
              </div>
    
              {/* Column 3: Photo Upload Section */}
              <div className="flex flex-col items-center justify-center p-4 border rounded-md bg-white">
                <h3 className="font-bold mb-2">Staff Photo (Mandatory)</h3>
                <div className="w-40 h-40 border-2 border-dashed border-gray-400 rounded-md flex items-center justify-center overflow-hidden mb-4">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Staff Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-center text-sm">Upload Photo</span>
                  )}
                </div>
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  onChange={handleChange}
                  className="w-full border p-2 rounded-md"
                  required
                />
              </div>
            </div>

            {/* Extra fields if Singer selected */}
            {formData.operation === singerOperationName && (
              <div className="p-6 border rounded-lg bg-gray-50">
                <h3 className="font-bold mb-4">
                  Assign Operators (for Singer)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Overlock */}
                  <div>
                    <label className="block font-semibold">
                      Overlock Operator
                    </label>
                    <select
                      name="overlockOperator"
                      value={formData.overlockOperator}
                      onChange={handleChange}
                      className="w-full border p-2 rounded-md"
                    >
                      <option value="">-- Select Overlock --</option>
                      {overlockStaff.map((s) => (
                        <option key={s.id} value={s.full_name}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Flatlock */}
                  <div>
                    <label className="block font-semibold">
                      Flatlock Operator
                    </label>
                    <select
                      name="flatlockOperator"
                      value={formData.flatlockOperator}
                      onChange={handleChange}
                      className="w-full border p-2 rounded-md"
                    >
                      <option value="">-- Select Flatlock --</option>
                      {flatlockStaff.map((s) => (
                        <option key={s.id} value={s.full_name}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Extra fields if Overlock selected */}
            {formData.operation === overlockOperationName && (
              <div className="p-6 border rounded-lg bg-gray-50">
                <h3 className="font-bold mb-4">Assign Flatlock Operator</h3>
                <div>
                  <label className="block font-semibold">
                    Flatlock Operator
                  </label>
                  <select
                    name="flatlockOperator"
                    value={formData.flatlockOperator}
                    onChange={handleChange}
                    className="w-full border p-2 rounded-md"
                  >
                    <option value="">-- Select Flatlock --</option>
                    {flatlockStaff.map((s) => (
                      <option key={s.id} value={s.full_name}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            {/* Document Uploads Section */}
            <div className="p-6 border rounded-lg bg-gray-50">
              <h3 className="font-bold mb-4">Document Uploads</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["aadharFront", "aadharBack", "panCardImage"].map(
                  (field) => (
                    <div key={field}>
                      <label className="block font-semibold">
                        {field.replace(/([A-Z])/g, " $1").trim()}
                      </label>
                      <input
                        type="file"
                        name={field}
                        accept="image/*"
                        onChange={handleChange}
                        className="w-full border p-2 rounded-md"
                      />
                    </div>
                  )
                )}
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full bg-[#0071bc] text-white px-4 py-2 rounded-lg"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddStaff;