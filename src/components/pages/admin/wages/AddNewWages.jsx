import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const AddNewWages = () => {
  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
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
    singerDeductAdvance: "",
    singerPayableAmount: "",
    deductAdvancePay: "",
    payableAmount: "",
    paymentType: "",
    flatlockWages: "",
    flatlockDeductAdvance: "",
    flatlockPayableAmount: "",
    overlockWages: "",
    overlockDeductAdvance: "",
    overlockPayableAmount: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [resetKey, setResetKey] = useState(Date.now());
  const [products, setProducts] = useState([]);
  const [operations, setOperations] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [flatlockStaff, setFlatlockStaff] = useState([]);
  const [overlockStaff, setOverlockStaff] = useState([]);
  const [sizeRangeValue, setSizeRangeValue] = useState("");
  const [singerPendingBalance, setSingerPendingBalance] = useState(null);
  const [flatlockPendingBalance, setFlatlockPendingBalance] = useState(null);
  const [overlockPendingBalance, setOverlockPendingBalance] = useState(null);
  const [productRates, setProductRates] = useState({});

  const { branchId } = useParams();
  const staffFetchingRef = useRef(false);

  const sizes = [
    { size: "2-3", rate: 22 },
    { size: "3-4", rate: 24 },
    { size: "4-5", rate: 26 },
    { size: "6-7", rate: 28 },
    { size: "7-8", rate: 30 },
    { size: "9-10", rate: 32 },
    { size: "11-12", rate: 34 },
    { size: "13-14", rate: 36 },
  ];

  useEffect(() => {
    const fetchInitialData = async () => {
      const storedToken = localStorage.getItem("branchToken");
      if (!storedToken || !branchId) return;

      const headers = { Authorization: `Bearer ${storedToken}` };
      const params = { branch_id: branchId };

      try {
        const operationsRes = await axios.get(
          `${apiBaseUrl}/api/operations`,
          { headers, params }
        );
        const filteredOperations = operationsRes.data.filter(
          (op) => op.name.toLowerCase() !== "cutting"
        );
        setOperations(filteredOperations);

        const productsRes = await axios.get(
          `${apiBaseUrl}/api/products`,
          { headers, params }
        );
        setProducts(productsRes.data);

        const rates = {};
        productsRes.data.forEach((p) => {
          try {
            rates[p.product_name] = JSON.parse(p.operations);
          } catch (e) {
            console.error("Error parsing product operations:", e);
          }
        });
        setProductRates(rates);
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }
    };
    fetchInitialData();
  }, [branchId]);

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
      setSingerPendingBalance(null);
      setFlatlockPendingBalance(null);
      setOverlockPendingBalance(null);

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
  }, [formData.operation, branchId]);

  useEffect(() => {
    const fetchDetails = async () => {
      const storedToken = localStorage.getItem("branchToken");
      if (!storedToken) return;

      const staffData = [
        {
          name: formData.staffName,
          list: filteredStaff,
          setBalance: setSingerPendingBalance,
          setDeduct: (balance) =>
            setFormData((prev) => ({
              ...prev,
              singerDeductAdvance: balance || "",
            })),
          fetchDetails: true,
        },
        {
          name: formData.flatlockOperator,
          list: flatlockStaff,
          setBalance: setFlatlockPendingBalance,
          setDeduct: (balance) =>
            setFormData((prev) => ({
              ...prev,
              flatlockDeductAdvance: balance || "",
            })),
        },
        {
          name: formData.overlockOperator,
          list: overlockStaff,
          setBalance: setOverlockPendingBalance,
          setDeduct: (balance) =>
            setFormData((prev) => ({
              ...prev,
              overlockDeductAdvance: balance || "",
            })),
        },
      ];

      for (const staff of staffData) {
        const staffId = staff.list.find((s) => s.full_name === staff.name)?.id;
        if (staffId) {
          if (
            staff.fetchDetails &&
            formData.operation.toLowerCase() === "singer"
          ) {
            try {
              const res = await axios.get(
                `${apiBaseUrl}/api/staff/${staffId}`,
                { headers: { Authorization: `Bearer ${storedToken}` } }
              );
              setFormData((prev) => ({
                ...prev,
                overlockOperator: res.data.overlock_operator || "",
                flatlockOperator: res.data.flatlock_operator || "",
              }));
            } catch (err) {
              console.error("Error fetching selected staff details:", err);
            }
          }
          try {
            const res = await axios.get(
              `${apiBaseUrl}/api/advance-payment/pending-balance`,
              {
                params: { staff_id: staffId },
                headers: { Authorization: `Bearer ${storedToken}` },
              }
            );
            if (res.data.success) {
              staff.setBalance(res.data.pendingBalance);
              staff.setDeduct(res.data.pendingBalance);
            } else {
              staff.setBalance(0);
              staff.setDeduct(0);
            }
          } catch (err) {
            console.error(
              `❌ Error fetching pending balance for ${staff.name}:`,
              err.response ? err.response.data : err.message
            );
            staff.setBalance(0);
            staff.setDeduct(0);
          }
        } else {
          staff.setBalance(0);
          staff.setDeduct(0);
        }
      }
    };

    fetchDetails();
  }, [
    formData.staffName,
    formData.flatlockOperator,
    formData.overlockOperator,
    filteredStaff,
    flatlockStaff,
    overlockStaff,
    formData.operation,
  ]);

  useEffect(() => {
    const calculateValues = () => {
      const selectedProduct = products.find(
        (p) => p.product_name === formData.product
      );

      let totalPieces = 0;
      for (const key in formData.sizeWiseEntry) {
        totalPieces += parseInt(formData.sizeWiseEntry[key] || 0, 10);
      }
      totalPieces += parseInt(formData.extraPieces || 0, 10);

      let grossAmount = 0;
      let flatlockGross = 0;
      let overlockGross = 0;

      if (selectedProduct && formData.operation) {
        try {
          const operations = selectedProduct.operations
            ? JSON.parse(selectedProduct.operations)
            : [];

          const currentOp = operations.find(
            (op) =>
              op.name.toLowerCase().trim() === formData.operation.toLowerCase().trim()
          );

          if (currentOp && !isNaN(parseFloat(currentOp.rate))) {
            grossAmount = totalPieces * parseFloat(currentOp.rate);
          }

          if (formData.operation.toLowerCase() === "singer") {
            const flatlockOp = operations.find(
              (op) => op.name.toLowerCase().trim() === "flatlock"
            );
            if (flatlockOp && !isNaN(parseFloat(flatlockOp.rate))) {
              flatlockGross = totalPieces * parseFloat(flatlockOp.rate);
            }

            const overlockOp = operations.find(
              (op) => op.name.toLowerCase().trim() === "overlock"
            );
            if (overlockOp && !isNaN(parseFloat(overlockOp.rate))) {
              overlockGross = totalPieces * parseFloat(overlockOp.rate);
            }
          }
        } catch (e) {
          console.error("Error parsing operations or finding rate:", e);
        }
      }

      const singerDeduct = parseFloat(formData.singerDeductAdvance) || 0;
      const flatlockDeduct = parseFloat(formData.flatlockDeductAdvance) || 0;
      const overlockDeduct = parseFloat(formData.overlockDeductAdvance) || 0;
      const otherDeduct = parseFloat(formData.deductAdvancePay) || 0;

      setFormData((prev) => ({
        ...prev,
        totalPieces: totalPieces.toString(),
        grossAmount: grossAmount.toString(),
        singerPayableAmount: (grossAmount - singerDeduct).toString(),
        payableAmount: (grossAmount - otherDeduct).toString(),
        flatlockWages: flatlockGross.toString(),
        flatlockPayableAmount: (flatlockGross - flatlockDeduct).toString(),
        overlockWages: overlockGross.toString(),
        overlockPayableAmount: (overlockGross - overlockDeduct).toString(),
      }));
    };

    calculateValues();
  }, [
    formData.product,
    formData.operation,
    formData.sizeWiseEntry,
    formData.extraPieces,
    products,
    formData.singerDeductAdvance,
    formData.flatlockDeductAdvance,
    formData.overlockDeductAdvance,
    formData.deductAdvancePay,
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
    const sizes = [
      "2-3",
      "3-4",
      "4-5",
      "6-7",
      "7-8",
      "9-10",
      "11-12",
      "13-14",
    ];
    sizes.forEach((size) => {
      newSizeEntries[size] = value;
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

    const payments = [];

    if (formData.staffName) {
      const basePayment = {
        date: formData.date,
        product_name: formData.product,
        operation_name: formData.operation,
        staff_name: formData.staffName,
        size_wise_entry: formData.sizeWiseEntry,
        extra_pieces: formData.extraPieces,
        total_pieces: formData.totalPieces,
        gross_amount: parseFloat(formData.grossAmount) || 0,
        payment_type: formData.paymentType,
        branchId,
      };

      if (formData.operation.toLowerCase() === "singer") {
        payments.push({
          ...basePayment,
          overlock_operator: formData.overlockOperator,
          flatlock_operator: formData.flatlockOperator,
          deduct_advance_pay: parseFloat(formData.singerDeductAdvance) || 0,
          payable_amount: parseFloat(formData.singerPayableAmount) || 0,
        });

        if (
          formData.overlockOperator &&
          formData.staffName !== formData.overlockOperator
        ) {
          payments.push({
            ...basePayment,
            operation_name: "Overlock",
            staff_name: formData.overlockOperator,
            gross_amount: parseFloat(formData.overlockWages) || 0,
            deduct_advance_pay: parseFloat(formData.overlockDeductAdvance) || 0,
            payable_amount: parseFloat(formData.overlockPayableAmount) || 0,
          });
        }

        if (
          formData.flatlockOperator &&
          formData.staffName !== formData.flatlockOperator
        ) {
          payments.push({
            ...basePayment,
            operation_name: "Flatlock",
            staff_name: formData.flatlockOperator,
            gross_amount: parseFloat(formData.flatlockWages) || 0,
            deduct_advance_pay: parseFloat(formData.flatlockDeductAdvance) || 0,
            payable_amount: parseFloat(formData.flatlockPayableAmount) || 0,
          });
        }
      } else {
        payments.push({
          ...basePayment,
          deduct_advance_pay: parseFloat(formData.deductAdvancePay) || 0,
          payable_amount: parseFloat(formData.payableAmount) || 0,
        });
      }
    }

    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/wages/add`,
        { payments },
        {
          headers: { Authorization: `Bearer ${storedToken}` },
        }
      );

      if (response.data.success) {
        alert("Wages added successfully!");
        setFormData(initialFormState);
        setResetKey(Date.now());
        setSingerPendingBalance(null);
        setFlatlockPendingBalance(null);
        setOverlockPendingBalance(null);
        setSizeRangeValue("");
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
                    {size.size} (Y{size.rate})
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold">Gross Amount</label>
                <input
                  type="text"
                  value={formData.grossAmount}
                  readOnly
                  className="w-full border p-2 rounded bg-gray-100"
                />
              </div>
              <div>
                <label className="block font-semibold">Deduct Advance</label>
                <input
                  type="number"
                  name={
                    formData.operation.toLowerCase() === "singer"
                      ? "singerDeductAdvance"
                      : "deductAdvancePay"
                  }
                  value={
                    formData.operation.toLowerCase() === "singer"
                      ? formData.singerDeductAdvance
                      : formData.deductAdvancePay
                  }
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                  min={0}
                />
                {singerPendingBalance !== null && (
                  <div className="text-sm text-right font-bold text-blue-600 mt-1">
                    Pending: ₹{singerPendingBalance}
                  </div>
                )}
              </div>
              <div>
                <label className="block font-semibold">Payable Amount</label>
                <input
                  type="text"
                  value={
                    formData.operation.toLowerCase() === "singer"
                      ? formData.singerPayableAmount
                      : formData.payableAmount
                  }
                  readOnly
                  className="w-full border p-2 rounded bg-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold">Payment Mode</label>
              <select
                name="paymentType"
                value={formData.paymentType}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">--Select Payment Mode--</option>
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cheque">Cheque</option>
              </select>
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