import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import Barcode from "react-barcode";

// Import logo
import ShrustiLogo from '../../../../assets/shrusti-logo.png';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Decode JWT without external library
const decodeJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

// Helper function: safe date format (DD/MM/YYYY)
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-GB");
  }
  return dateStr;
};

// Helper function to convert image to base64 - same as Add page
const imageToBase64 = (img) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
};

// Modal Component to show details
const DetailsModal = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-xl font-bold mb-4 text-center">Fabric Details</h3>
        <ul className="space-y-2">
          <li>
            <strong>Supplier Name:</strong> {item.supplier_name}
          </li>
          <li>
            <strong>Date:</strong> {formatDate(item.date)}
          </li>
          <li>
            <strong>Invoice Number:</strong> {item.invoice_no}
          </li>
          <li>
            <strong>Fabric Type:</strong> {item.fabric_type_name}
          </li>
          <li>
            <strong>Color:</strong> {item.color || 'N/A'}
          </li>
          <li>
            <strong>Unique Number:</strong> {item.unique_number}
          </li>
          <li>
            <strong>Weight:</strong> {item.weight_of_material} kg
          </li>
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

// Edit Modal Component
const EditModal = ({ item, onClose, onSave }) => {
  const [editData, setEditData] = useState({
    weight_of_material: item?.weight_of_material || '',
    color: item?.color || '',
    invoice_no: item?.invoice_no || ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSave(item.id, editData);
      onClose();
    } catch (error) {
      console.error('Error updating:', error);
      alert('Failed to update record');
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-xl font-bold mb-4 text-center">Edit Fabric Details</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Weight (kg)</label>
            <input
              type="text"
              name="weight_of_material"
              value={editData.weight_of_material}
              onChange={handleChange}
              placeholder="Enter weight"
              className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="^\d+(\.\d+)?$"
              title="Please enter a valid weight (e.g., 5, 5.25)"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Color</label>
            <input
              type="text"
              name="color"
              value={editData.color}
              onChange={handleChange}
              placeholder="Enter fabric color"
              className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Invoice Number</label>
            <input
              type="text"
              name="invoice_no"
              value={editData.invoice_no}
              onChange={handleChange}
              placeholder="Enter invoice number"
              className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ViewFabric = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { branchId: urlBranchId } = useParams();

  const [branchId, setBranchId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFabricDetails, setSelectedFabricDetails] = useState(null);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState(null);
  const printModalRef = useRef(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

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
      console.warn(
        "Branch ID mismatch between token and URL. Redirecting to correct branch page."
      );
      navigate(`/admin/${branchId}/dashboard/fabric/view`);
    }
  }, [branchId, urlBranchId, navigate]);

  const fetchData = async (currentBranchId) => {
    const token = localStorage.getItem("branchToken");
    if (!token) {
      console.error("Login required. Redirecting to login page.");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const [receiptsRes, suppliersRes] = await Promise.all([
        axios.get(`${apiBaseUrl}/api/receipts?branchId=${currentBranchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(
          `${apiBaseUrl}/api/receipts/suppliers?branchId=${currentBranchId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);

      const suppliersMap = new Map(
        suppliersRes.data.map((s) => [
          s.id,
          {
            name: s.supplier_name,
            shortName: s.supplier_short_name,
          },
        ])
      );

      const mappedReceipts = receiptsRes.data.map((receipt) => {
        const supplierInfo = suppliersMap.get(receipt.supplier_id) || {
          name: "Unknown",
          shortName: "N/A",
        };
        return {
          ...receipt,
          supplier_name: supplierInfo.name,
          supplier_short_name: supplierInfo.shortName,
          fabric_type_name: receipt.fabric_type ? receipt.fabric_type : "N/A",
        };
      });

      setReceipts(mappedReceipts);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleView = (item) => {
    setSelectedFabricDetails(item);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedFabricDetails(null);
  };

  const handleDuplicate = (item) => {
    localStorage.setItem(
      "duplicateData",
      JSON.stringify({
        unique_number: item.unique_number,
        supplier_name: item.supplier_name,
        supplier_short_name: item.supplier_short_name,
        invoice_no: item.invoice_no,
        date: item.date,
        weight_of_material: item.weight_of_material,
        fabric_type: item.fabric_type,
        color: item.color,
      })
    );
    navigate(`/admin/${branchId}/dashboard/fabric/add`);
  };

  const handlePrint = (item) => {
    setPrintData(item);
    setShowPrintModal(true);
  };

  // Edit functionality
  const handleEdit = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (itemId, updatedData) => {
    const token = localStorage.getItem("branchToken");
    
    try {
      await axios.put(`${apiBaseUrl}/api/receipts/${itemId}`, {
        ...updatedData,
        branchId: branchId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh the data after successful update
      await fetchData(branchId);
      
      alert('Record updated successfully!');
    } catch (error) {
      console.error('Error updating receipt:', error);
      throw error;
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
  };

  // FIXED: Print function - exactly like Add page
  const printReceiptModal = async () => {
    if (!printModalRef.current || !printData) return;

    // Logo loading promise - same approach as Add page
    const loadLogo = () => {
        return new Promise((resolve, reject) => {
            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            logoImg.onload = () => resolve(logoImg);
            logoImg.onerror = reject;
            logoImg.src = ShrustiLogo;
        });
    };

    try {
        const logoImg = await loadLogo();
        const logoBase64 = imageToBase64(logoImg);
        
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Receipt</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; 
                            margin: 0; 
                            padding: 20px; 
                            background: white; 
                        }
                        .receipt-container { 
                            width: 4.2in; 
                            height: 5in; 
                            margin: 0 auto;
                            background: white;
                            border-radius: 24px;
                            padding: 24px;
                            box-shadow: none;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                            align-items: center;
                        }
                        .header { 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            width: 100%; 
                            margin-bottom: 16px; 
                        }
                        .header-content { 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            width: 100%; 
                        }
                        .logo { 
                            height: 80px; 
                            width: 80px; 
                            margin-right: 16px; 
                        }
                        .logo-text { 
                            color: #1f2937; 
                            font-weight: bold; 
                            font-size: 2rem; 
                            line-height: 1.2; 
                        }
                        .info { 
                            color: #1f2937; 
                            font-size: 0.875rem; 
                            width: 100%; 
                        }
                        .info-header { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center; 
                            margin-bottom: 8px; 
                        }
                        .date { font-weight: bold; }
                        .formatted-id { font-weight: bold; font-size: 1.125rem; }
                        .info-grid { 
                            display: grid; 
                            grid-template-columns: 1fr 1fr; 
                            gap: 16px 4px; 
                            margin-top: 16px; 
                        }
                        .info-grid p { margin: 0; }
                        .barcode-container { 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            margin-top: 24px; 
                        }
                        .barcode-number { 
                            text-align: center; 
                            font-family: 'Courier New', monospace; 
                            font-size: 1.25rem; 
                            color: #1f2937; 
                            letter-spacing: 0.1em; 
                            margin-top: 8px; 
                        }
                        @media print {
                            body { margin: 0; padding: 0; }
                            .receipt-container { 
                                box-shadow: none; 
                                border: none; 
                                margin: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        <div class="header">
                            <div class="header-content">
                                <img src="${logoBase64}" alt="Shrusti Clothing Logo" class="logo" />
                                <div class="logo-text">
                                    <p>SHRUSTI</p>
                                    <p>CLOTHING</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="info">
                            <div class="info-header">
                                <p class="date">${formatDate(printData.date)}</p>
                                <p class="formatted-id">${printData.supplier_short_name}-${printData.invoice_no}-${new Date(printData.date).getFullYear()}</p>
                            </div>
                            <div class="info-grid">
                                <p><strong>Supplier:</strong> ${printData.supplier_name}</p>
                                <p><strong>Fabric type:</strong> ${printData.fabric_type_name}</p>
                                <p><strong>Invoice No.:</strong> ${printData.invoice_no}</p>
                                <p><strong>Color:</strong> ${printData.color || 'N/A'}</p>
                                <p><strong>Weight:</strong> ${printData.weight_of_material} kg</p>
                            </div>
                        </div>
                        
                        <div class="barcode-container">
                            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" style="background:transparent;">
                                <g fill="black">
                                    <rect width="2" height="60" x="4" y="0"/>
                                    <rect width="1" height="60" x="7" y="0"/>
                                    <rect width="2" height="60" x="10" y="0"/>
                                    <rect width="1" height="60" x="14" y="0"/>
                                    <rect width="1" height="60" x="17" y="0"/>
                                    <rect width="3" height="60" x="20" y="0"/>
                                    <rect width="1" height="60" x="25" y="0"/>
                                    <rect width="2" height="60" x="28" y="0"/>
                                    <rect width="1" height="60" x="32" y="0"/>
                                    <rect width="3" height="60" x="35" y="0"/>
                                    <rect width="2" height="60" x="40" y="0"/>
                                    <rect width="1" height="60" x="44" y="0"/>
                                    <rect width="2" height="60" x="47" y="0"/>
                                    <rect width="1" height="60" x="51" y="0"/>
                                    <rect width="1" height="60" x="54" y="0"/>
                                    <rect width="3" height="60" x="57" y="0"/>
                                    <rect width="1" height="60" x="62" y="0"/>
                                    <rect width="2" height="60" x="65" y="0"/>
                                    <rect width="1" height="60" x="69" y="0"/>
                                    <rect width="3" height="60" x="72" y="0"/>
                                    <rect width="2" height="60" x="77" y="0"/>
                                    <rect width="1" height="60" x="81" y="0"/>
                                    <rect width="2" height="60" x="84" y="0"/>
                                    <rect width="1" height="60" x="88" y="0"/>
                                    <rect width="1" height="60" x="91" y="0"/>
                                    <rect width="3" height="60" x="94" y="0"/>
                                    <rect width="1" height="60" x="99" y="0"/>
                                    <rect width="2" height="60" x="102" y="0"/>
                                    <rect width="1" height="60" x="106" y="0"/>
                                    <rect width="3" height="60" x="109" y="0"/>
                                    <rect width="2" height="60" x="114" y="0"/>
                                    <rect width="1" height="60" x="118" y="0"/>
                                    <rect width="2" height="60" x="121" y="0"/>
                                    <rect width="1" height="60" x="125" y="0"/>
                                    <rect width="1" height="60" x="128" y="0"/>
                                    <rect width="3" height="60" x="131" y="0"/>
                                    <rect width="1" height="60" x="136" y="0"/>
                                    <rect width="2" height="60" x="139" y="0"/>
                                    <rect width="1" height="60" x="143" y="0"/>
                                    <rect width="2" height="60" x="146" y="0"/>
                                    <rect width="1" height="60" x="150" y="0"/>
                                    <rect width="3" height="60" x="153" y="0"/>
                                    <rect width="2" height="60" x="158" y="0"/>
                                    <rect width="1" height="60" x="162" y="0"/>
                                    <rect width="2" height="60" x="165" y="0"/>
                                    <rect width="1" height="60" x="169" y="0"/>
                                    <rect width="1" height="60" x="172" y="0"/>
                                    <rect width="3" height="60" x="175" y="0"/>
                                    <rect width="1" height="60" x="180" y="0"/>
                                    <rect width="2" height="60" x="183" y="0"/>
                                    <rect width="1" height="60" x="187" y="0"/>
                                    <rect width="2" height="60" x="190" y="0"/>
                                    <rect width="1" height="60" x="194" y="0"/>
                                </g>
                            </svg>
                            <p class="barcode-number">${printData.unique_number}</p>
                        </div>
                    </div>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        
        // Wait for logo to load, then print
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);

    } catch (error) {
        console.error("Logo loading failed for print:", error);
        // Fallback without logo
        alert("Print failed. Please try again.");
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
              <th className="border-b p-3">Color</th>
              <th className="border-b p-3">Invoice number</th>
              <th className="border-b p-3">Weight (kg)</th>
              <th className="border-b p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length > 0 ? (
              receipts.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="border-b p-3">{index + 1}</td>
                  <td className="border-b p-3">{formatDate(item.date)}</td>
                  <td className="border-b p-3">{item.supplier_name}</td>
                  <td className="border-b p-3">{item.fabric_type_name}</td>
                  <td className="border-b p-3">{item.color || 'N/A'}</td>
                  <td className="border-b p-3">{item.invoice_no}</td>
                  <td className="border-b p-3">{item.weight_of_material}</td>
                  <td className="border-b p-3 flex justify-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleView(item)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(item)}
                      className="text-purple-600 hover:text-purple-800 font-medium"
                    >
                      📋 Duplicate
                    </button>
                    <button
                      onClick={() => handlePrint(item)}
                      className="bg-gray-700 text-white px-3 py-1 rounded-md hover:bg-black transition-colors"
                    >
                      📑 Print
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="border-b p-3 text-center text-gray-500"
                  colSpan="8"
                >
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {showDetailsModal && (
        <DetailsModal item={selectedFabricDetails} onClose={handleCloseModal} />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditModal 
          item={editingItem} 
          onClose={handleCloseEditModal}
          onSave={handleSaveEdit}
        />
      )}

      {/* FIXED: Print Modal with Logo and Company Name - exactly like Add page */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Print Receipt</h2>
            <div 
              ref={printModalRef} 
              className="bg-white rounded-3xl p-6 flex flex-col justify-between items-center"
              style={{ width: '4.2in', height: '5in' }}
            >
              {printData && (
                <>
                  {/* Header Section with Logo - exactly like Add page */}
                  <div className="flex flex-col items-center w-full mb-4">
                    <div className="flex items-center justify-center w-full">
                      <img src={ShrustiLogo} alt="Shrusti Clothing Logo" className="h-20 w-20 mr-4" />
                      <div className="text-gray-900 font-bold text-2xl leading-tight">
                        <p>SHRUSTI</p>
                        <p>CLOTHING</p>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Details - exactly like Add page */}
                  {(() => {
                    const year = new Date(printData.date).getFullYear();
                    const formattedId = `${printData.supplier_short_name}-${printData.invoice_no}-${year}`;
                    return (
                      <div className="text-gray-900 text-sm w-full">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-bold">{formatDate(printData.date)}</p>
                          <p className="font-bold text-lg">{formattedId}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4">
                          <p><strong>Supplier:</strong> {printData.supplier_name}</p>
                          <p><strong>Fabric type:</strong> {printData.fabric_type_name}</p>
                          <p><strong>Invoice No.:</strong> {printData.invoice_no}</p>
                          <p><strong>Color:</strong> {printData.color || 'N/A'}</p>
                          <p><strong>Weight:</strong> {printData.weight_of_material} kg</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Barcode Section - exactly like Add page */}
                  <div className="flex flex-col items-center mt-6">
                    {printData.unique_number && (
                      <Barcode
                        value={printData.unique_number}
                        format="CODE128"
                        width={2.0}
                        height={60}
                        displayValue={false}
                        background="transparent"
                      />
                    )}
                    <p className="text-center font-mono text-xl text-gray-900 tracking-widest mt-2">
                      {printData.unique_number}
                    </p>
                  </div>
                </>
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