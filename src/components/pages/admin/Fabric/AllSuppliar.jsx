import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Decode JWT without external library
const decodeJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

// Safe date formatter
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-GB"); // DD/MM/YYYY
  }
  return dateStr;
};

const AllSuppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSupplierReceipts, setSelectedSupplierReceipts] = useState([]);
  const [viewingSupplierName, setViewingSupplierName] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [branchId, setBranchId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("branchToken");
    if (token) {
      const decoded = decodeJwt(token);
      if (decoded && decoded.branch_id) {
        setBranchId(decoded.branch_id);
      } else {
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch with auth
  const fetchWithAuth = async (url, params = {}) => {
    const token = localStorage.getItem("branchToken");
    if (!token) {
      setError("Login required.");
      navigate("/login");
      return null;
    }
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return response;
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        setError("Session expired. Please log in again.");
        navigate("/login");
      }
      throw err;
    }
  };

  useEffect(() => {
    if (!branchId) return;

    const fetchSuppliers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(`${apiBaseUrl}/api/receipts/suppliers`, { branchId });
        if (res) setSuppliers(res.data);
      } catch (err) {
        console.error("Error fetching suppliers:", err);
        setError("Error fetching data.");
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, [branchId, navigate]);

  const handleViewStock = async (supplierId) => {
    setLoading(true);
    setError(null);
    const supplier = suppliers.find((s) => s.id === supplierId);
    setViewingSupplierName(supplier?.supplier_name);
    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/api/receipts/by-supplier/${supplierId}`, { branchId });
      if (res) {
        setSelectedSupplierReceipts(res.data); // No mapping needed, as we're not showing the column
        setShowStockModal(true);
      }
    } catch (err) {
      console.error("Error fetching stock:", err);
      setError("Failed to fetch stock data.");
      setSelectedSupplierReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowStockModal(false);
    setSelectedSupplierReceipts([]);
    setViewingSupplierName(null);
  };

  if (!branchId || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-800 text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">All Suppliers</h1>
      {error && <div className="text-center text-red-500 mb-4">{error}</div>}

      {suppliers.length > 0 ? (
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 px-4 py-2 text-left">S.No.</th>
              <th className="border border-gray-200 px-4 py-2 text-left">Full Name</th>
              <th className="border border-gray-200 px-4 py-2 text-left">Short Name</th>
              <th className="border border-gray-200 px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier, idx) => (
              <tr key={supplier.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-2">{idx + 1}</td>
                <td className="border border-gray-200 px-4 py-2">{supplier.supplier_name}</td>
                <td className="border border-gray-200 px-4 py-2">{supplier.supplier_short_name}</td>
                <td className="border border-gray-200 px-4 py-2 text-center">
                  <button
                    onClick={() => handleViewStock(supplier.id)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                  >
                    View Stock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center text-gray-500">No suppliers found.</div>
      )}

      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto text-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Stock for {viewingSupplierName}</h2>
              <button
                onClick={handleCloseModal}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>

            {selectedSupplierReceipts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-4 py-2 text-left">S.No.</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Unique Number</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Invoice No</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSupplierReceipts.map((receipt, idx) => (
                      <tr key={receipt.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-2">{idx + 1}</td>
                        <td className="border border-gray-200 px-4 py-2">{formatDate(receipt.date)}</td>
                        <td className="border border-gray-200 px-4 py-2">{receipt.unique_number}</td>
                        <td className="border border-gray-200 px-4 py-2">{receipt.invoice_no}</td>
                        <td className="border border-gray-200 px-4 py-2">{receipt.weight_of_material}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500">No stock records found for this supplier.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllSuppliers;