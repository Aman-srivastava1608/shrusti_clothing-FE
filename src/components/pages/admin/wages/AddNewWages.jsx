import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getTodayDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const initialFormState = {
  date: getTodayDate(),
  product: "",
  operation: "",
  staffName: "",
  overlockOperator: "",
  flatlockOperator: "",
  sizeWiseEntry: {},
  extraPieces: "",
  totalPieces: "",
  grossAmount: "",
};

const AddNewWages = () => {
  const [formData, setFormData] = useState(initialFormState);
  const [resetKey, setResetKey] = useState(Date.now());
  const [products, setProducts] = useState([]);
  const [operations, setOperations] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [flatlockStaff, setFlatlockStaff] = useState([]);
  const [overlockStaff, setOverlockStaff] = useState([]);
  const [sizeRangeValue, setSizeRangeValue] = useState("");
  const { branchId } = useParams();
  const staffFetchingRef = useRef(false);

  const sizes = [
    { size: "2-3" },
    { size: "3-4" },
    { size: "4-5" },
    { size: "6-7" },
    { size: "7-8" },
    { size: "9-10" },
    { size: "11-12" },
    { size: "13-14" },
  ];

  // Fetch initial data (products and operations)
  useEffect(() => {
    const fetchInitialData = async () => {
      const storedToken = localStorage.getItem("branchToken");
      if (!storedToken || !branchId) return;

      const headers = { Authorization: `Bearer ${storedToken}` };
      const params = { branch_id: branchId };

      try {
        const operationsRes = await axios.get(`${apiBaseUrl}/api/operations`, {
          headers,
          params,
        });
        const filteredOperations = operationsRes.data.filter(
          (op) => op.name.toLowerCase() !== "cutting"
        );
        setOperations(filteredOperations);

        const productsRes = await axios.get(`${apiBaseUrl}/api/products`, {
          headers,
          params,
        });
        setProducts(productsRes.data);
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }
    };
    fetchInitialData();
  }, [branchId]);

  // Fetch staff based on selected operation - UPDATED DEPENDENCY ARRAY
  useEffect(() => {
    const fetchStaffByOperation = async () => {
      const { operation } = formData;
      const storedToken = localStorage.getItem("branchToken");
      if (!operation || !storedToken || !branchId) {
        setFilteredStaff([]);
        setFlatlockStaff([]);
        setOverlockStaff([]);
        return;
      }

      if (staffFetchingRef.current === operation) {
        return;
      }
      staffFetchingRef.current = operation;

      setFormData((prev) => ({
        ...prev,
        staffName: "",
        flatlockOperator: "",
        overlockOperator: "",
      }));

      const headers = { Authorization: `Bearer ${storedToken}` };
      const params = { branch_id: branchId };

      try {
        const staffRes = await axios.get(
          `${apiBaseUrl}/api/staff/by-operation/${operation}`,
          { headers, params }
        );
        setFilteredStaff(staffRes.data);

        if (operation.toLowerCase() === "singer") {
          const flatlockRes = await axios.get(
            `${apiBaseUrl}/api/staff/by-operation/Flatlock`,
            { headers, params }
          );
          setFlatlockStaff(flatlockRes.data);

          const overlockRes = await axios.get(
            `${apiBaseUrl}/api/staff/by-operation/Overlock`,
            { headers, params }
          );
          setOverlockStaff(overlockRes.data);
        } else {
          setFlatlockStaff([]);
          setOverlockStaff([]);
        }
      } catch (err) {
        console.error("Error fetching specialized staff:", err);
        setFilteredStaff([]);
        setFlatlockStaff([]);
        setOverlockStaff([]);
      }
    };
    fetchStaffByOperation();
  }, [formData.operation, branchId, resetKey]); // ADDED `resetKey` HERE

  // Calculate total pieces and gross amount
  useEffect(() => {
    const calculateWages = () => {
      let totalPieces = 0;
      for (const key in formData.sizeWiseEntry) {
        totalPieces += parseInt(formData.sizeWiseEntry[key] || 0, 10);
      }
      totalPieces += parseInt(formData.extraPieces || 0, 10);

      const selectedProduct = products.find(
        (p) => p.product_name === formData.product
      );
      let grossAmount = 0;
      if (selectedProduct && selectedProduct.operations) {
        try {
          const operations = JSON.parse(selectedProduct.operations);
          const currentOp = operations.find(
            (op) =>
              op.name.toLowerCase().trim() === formData.operation.toLowerCase().trim()
          );
          if (currentOp && !isNaN(parseFloat(currentOp.rate))) {
            grossAmount = totalPieces * parseFloat(currentOp.rate);
          }
        } catch (e) {
          console.error("Error parsing operations or finding rate:", e);
        }
      }

      setFormData((prev) => ({
        ...prev,
        totalPieces: totalPieces.toString(),
        grossAmount: grossAmount.toString(),
      }));
    };
    calculateWages();
  }, [
    formData.product,
    formData.operation,
    formData.sizeWiseEntry,
    formData.extraPieces,
    products,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("size-")) {
      const sizeKey = name.replace("size-", "");
      setFormData((prev) => ({
        ...prev,
        sizeWiseEntry: {
          ...prev.sizeWiseEntry,
          [sizeKey]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSizeRangeChange = (e) => {
    const value = e.target.value;
    setSizeRangeValue(value);
    const newSizeEntries = {};
    sizes.forEach((size) => {
      newSizeEntries[size.size] = value;
    });
    setFormData((prev) => ({ ...prev, sizeWiseEntry: newSizeEntries }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const storedToken = localStorage.getItem("branchToken");

    if (!storedToken) {
      alert("Authentication token missing. Please log in again.");
      return;
    }

    const {
      date,
      product,
      operation,
      staffName,
      overlockOperator,
      flatlockOperator,
      sizeWiseEntry,
      extraPieces,
      totalPieces,
      grossAmount,
    } = formData;

    const dataToSend = {
      date,
      product_name: product,
      operation_name: operation,
      staff_name: staffName,
      size_wise_entry: sizeWiseEntry,
      extra_pieces: parseInt(extraPieces || 0, 10),
      total_pieces: parseInt(totalPieces || 0, 10),
      gross_amount: parseFloat(grossAmount || 0),
      // Payment mode is now omitted from the data sent to the backend
      branchId,
    };

    if (operation.toLowerCase() === "singer") {
      if (!staffName || !flatlockOperator || !overlockOperator) {
        alert(
          "Please select a Singer, Flatlock Operator, and Overlock Operator."
        );
        return;
      }
      dataToSend.flatlock_operator = flatlockOperator;
      dataToSend.overlock_operator = overlockOperator;
    } else {
      if (!staffName) {
        alert("Please select a staff member.");
        return;
      }
    }

    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/wages/add`,
        { payments: [dataToSend] },
        {
          headers: { Authorization: `Bearer ${storedToken}` },
        }
      );

      if (response.data.success) {
        alert("Wages added successfully!");
        setFormData(initialFormState);
        setResetKey(Date.now());
        setSizeRangeValue("");
        staffFetchingRef.current = false; // Reset the ref
      } else {
        alert(`Error: ${response.data.error}`);
      }
    } catch (err) {
      console.error(
        "Error submitting wages:",
        err.response ? err.response.data : err.message
      );
      alert("Failed to add wages. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-4 text-[#0071bc]">
            Add New Wages
          </h2>
          <form key={resetKey} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold">Select Product</label>
                <select
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">--Select Product--</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.product_name}>
                      {p.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold">Operation</label>
                <select
                  name="operation"
                  value={formData.operation}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">--Select Operation--</option>
                  {operations.map((op) => (
                    <option key={op.id} value={op.name}>
                      {op.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold">Staff</label>
                <select
                  name="staffName"
                  value={formData.staffName}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">--Select Staff--</option>
                  {filteredStaff.map((staff) => (
                    <option key={staff.id} value={staff.full_name}>
                      {staff.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.operation &&
              formData.operation.toLowerCase() === "singer" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold">
                      Flatlock Operator
                    </label>
                    <select
                      name="flatlockOperator"
                      value={formData.flatlockOperator}
                      onChange={handleChange}
                      className="w-full border p-2 rounded"
                      required
                    >
                      <option value="">--Select Flatlock Staff--</option>
                      {flatlockStaff.map((staff) => (
                        <option key={staff.id} value={staff.full_name}>
                          {staff.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold">
                      Overlock Operator
                    </label>
                    <select
                      name="overlockOperator"
                      value={formData.overlockOperator}
                      onChange={handleChange}
                      className="w-full border p-2 rounded"
                      required
                    >
                      <option value="">--Select Overlock Staff--</option>
                      {overlockStaff.map((staff) => (
                        <option key={staff.id} value={staff.full_name}>
                          {staff.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

            <div>
              <label className="block font-semibold">Set All Sizes</label>
              <input
                type="number"
                name="sizeRange"
                value={sizeRangeValue}
                onChange={handleSizeRangeChange}
                className="w-full border p-2 rounded"
                min={0}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {sizes.map((size) => (
                <div key={size.size}>
                  <label className="block text-sm">
                    {size.size}
                  </label>
                  <input
                    type="number"
                    name={`size-${size.size}`}
                    value={formData.sizeWiseEntry[size.size] || ""}
                    onChange={handleChange}
                    className="w-full border p-1 rounded"
                    min={0}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold">Extra Pieces</label>
                <input
                  type="number"
                  name="extraPieces"
                  value={formData.extraPieces}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  min={0}
                />
              </div>
              <div>
                <label className="block font-semibold">Total Pieces</label>
                <input
                  type="text"
                  value={formData.totalPieces}
                  readOnly
                  className="w-full border p-2 rounded bg-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold">Gross Amount</label>
              <input
                type="text"
                value={formData.grossAmount}
                readOnly
                className="w-full border p-2 rounded bg-gray-100"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-4"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddNewWages;