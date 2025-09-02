import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Decode JWT without external library
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

// 🔹 Helper function: safe date format (DD/MM/YYYY)
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-GB");
  }
  return dateStr;
};

// 🔹 Modal Component to show details
const DetailsModal = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-xl font-bold mb-4 text-center">Fabric Details</h3>
        <ul className="space-y-2">
          <li><strong>Supplier Name:</strong> {item.supplier_name}</li>
          <li><strong>Date:</strong> {formatDate(item.date)}</li>
          <li><strong>Invoice Number:</strong> {item.invoice_no}</li>
          <li><strong>Fabric Type:</strong> {item.fabric_type_name}</li>
          <li><strong>Unique Number:</strong> {item.unique_number}</li>
          <li><strong>Weight:</strong> {item.weight_of_material} kg</li>
        </ul>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


const ViewFabric = () => {
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { branchId: urlBranchId } = useParams();
  
  const [branchId, setBranchId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFabricDetails, setSelectedFabricDetails] = useState(null);

  // State for Print Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState(null);
  const printModalRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("branchToken");
    if (token) {
      const decoded = decodeJwt(token);
      if (decoded && decoded.branch_id) {
        setBranchId(decoded.branch_id);
      } else {
        console.error("Failed to decode token or get branch ID.");
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (branchId && branchId === parseInt(urlBranchId)) {
        fetchData(branchId);
    } else if (branchId && branchId !== parseInt(urlBranchId)) {
      console.warn("Branch ID mismatch between token and URL. Redirecting to correct branch page.");
      navigate(`/admin/${branchId}/dashboard/fabric/view`);
    }
  }, [branchId, urlBranchId, navigate]);

  const fetchData = async (currentBranchId) => {
    const token = localStorage.getItem('branchToken');
    if (!token) {
      console.error("Login required. Redirecting to login page.");
      navigate("/login");
      return;
    }
    
    setLoading(true);

    try {
      const [receiptsRes, suppliersRes, fabricTypesRes] = await Promise.all([
        axios.get(`${apiBaseUrl}/api/receipts?branchId=${currentBranchId}`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${apiBaseUrl}/api/receipts/suppliers?branchId=${currentBranchId}`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${apiBaseUrl}/api/receipts/fabric-types?branchId=${currentBranchId}`, { headers: { Authorization: `Bearer ${token}` }})
      ]);

      const suppliersMap = new Map(suppliersRes.data.map(s => [s.id, s.supplier_name]));
      const fabricTypesMap = new Map(fabricTypesRes.data.map(f => [f.id, f.fabric_type_name]));

      const mappedReceipts = receiptsRes.data.map(receipt => ({
        ...receipt,
        supplier_name: suppliersMap.get(receipt.supplier_id) || 'Unknown',
        fabric_type_name: receipt.fabric_type || 'N/A'
      }));
      
      setReceipts(mappedReceipts);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ New function to handle view button click and show modal
  const handleView = (item) => {
    setSelectedFabricDetails(item);
    setShowDetailsModal(true);
  };
  
  // ✅ Function to handle closing the modal
  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedFabricDetails(null);
  };

  // ✅ CORRECTED: handleDuplicate function
  const handleDuplicate = (item) => {
    localStorage.setItem("duplicateData", JSON.stringify({
      unique_number: item.unique_number,
      supplier_name: item.supplier_name,
      supplier_short_name: item.supplier_short_name,
      invoice_no: item.invoice_no,
      date: item.date,
      weight_of_material: item.weight_of_material,
      fabric_type: item.fabric_type,
    }));
    navigate(`/admin/${branchId}/dashboard/fabric/add`);
  };
  
  // ✅ Updated handlePrint to show a modal first
  const handlePrint = (item) => {
    setPrintData(item);
    setShowPrintModal(true);
  };

  // ✅ New function to print only the modal content
  const printReceiptModal = () => {
    const printContent = printModalRef.current;
    if (printContent) {
      const newWindow = window.open('', '_blank');
      newWindow.document.write('<html><head><title>Fabric Receipt</title></head><body>');
      newWindow.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; } }</style>');
      newWindow.document.write(printContent.innerHTML);
      newWindow.document.write('</body></html>');
      newWindow.document.close();
      newWindow.focus();
      newWindow.print();
      newWindow.close();
      setShowPrintModal(false);
      setPrintData(null);
    }
  };

  if (!branchId || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-center text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 min-h-screen text-gray-800">
      <h2 className="text-xl font-bold mb-4">View Fabric</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 text-center shadow-lg rounded-lg">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="border-b p-3">S. No.</th>
              <th className="border-b p-3">Date</th>
              <th className="border-b p-3">Supplier name</th>
              <th className="border-b p-3">Fabric Type</th>
              <th className="border-b p-3">Invoice number</th>
              <th className="border-b p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length > 0 ? (
              receipts.map((item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="border-b p-3">{index + 1}</td>
                  <td className="border-b p-3">{formatDate(item.date)}</td>
                  <td className="border-b p-3">{item.supplier_name}</td>
                  <td className="border-b p-3">{item.fabric_type_name}</td>
                  <td className="border-b p-3">{item.invoice_no}</td>
                  <td className="border-b p-3 flex justify-center gap-2">
                    {/* ✅ Updated View button with modal functionality */}
                    <button
                      onClick={() => handleView(item)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDuplicate(item)}
                      className="text-purple-600 hover:text-purple-800 font-medium"
                    >
                      📋 Duplicate
                    </button>
                    <button onClick={() => handlePrint(item)} className="bg-gray-700 text-white px-3 py-1 rounded-md hover:bg-black transition-colors">
                      📑 Print
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="border-b p-3 text-center text-gray-500"
                  colSpan="6"
                >
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-4 gap-2 text-sm">
        <span className="text-gray-600">Page 1, 2, 3, 4 ...</span>
      </div>
      
      {/* 🔹 Render the modal if showDetailsModal is true */}
      {showDetailsModal && (
        <DetailsModal item={selectedFabricDetails} onClose={handleCloseModal} />
      )}
      
      {/* ✅ Print Modal component */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <div ref={printModalRef}>
              <h3 className="text-2xl font-bold mb-4 text-center">Fabric Receipt</h3>
              {printData && (
                <div className="p-4 border border-gray-300 rounded-lg">
                  <p><strong>Date:</strong> {formatDate(printData.date)}</p>
                  <p><strong>Supplier:</strong> {printData.supplier_name}</p>
                  <p><strong>Invoice No:</strong> {printData.invoice_no}</p>
                  <p><strong>Fabric Type:</strong> {printData.fabric_type_name}</p>
                  <p><strong>Weight:</strong> {printData.weight_of_material} kg</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6 space-x-2">
              <button
                onClick={() => setShowPrintModal(false)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={printReceiptModal}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewFabric;