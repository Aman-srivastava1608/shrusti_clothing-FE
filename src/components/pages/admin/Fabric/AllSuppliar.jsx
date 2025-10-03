import React, { useEffect, useState, useRef, forwardRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Barcode from 'react-barcode';
import ShrustiLogo from '../../../../assets/shrusti-logo.png';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Helper function to decode JWT token without an external library
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

// Updated ReceiptToPrint Component with Color field
const ReceiptToPrint = forwardRef(({ receiptData }, ref) => {
  if (!receiptData) {
    return null;
  }

  const {
    supplier_name,
    invoice_no,
    fabric_type,
    color,
    weight_of_material,
    date,
    unique_number
  } = receiptData;

  const supplierShortNamePart = supplier_name ? supplier_name.split(' ')[0] : 'N/A';
  const formattedId = `${supplierShortNamePart}-${invoice_no}-${new Date(date).getFullYear()}`;

  const styles = {
    container: {
      width: '5in',
      height: '4in',
      padding: '0.5in',
      backgroundColor: 'white',
      borderRadius: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontFamily: 'Arial, sans-serif',
      color: '#1f2937',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: '16px'
    },
    logoSection: {
      display: 'flex',
      alignItems: 'center'
    },
    logo: {
      height: '40px',
      width: '40px',
      marginRight: '8px'
    },
    companyText: {
      color: '#1f2937',
      fontWeight: 'bold',
      fontSize: '18px',
      lineHeight: '1.2'
    },
    wagesTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#0071bc'
    },
    receiptDetails: {
      color: '#1f2937',
      fontSize: '14px',
      width: '100%'
    },
    dateIdRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    },
    dateText: {
      fontWeight: 'bold'
    },
    idText: {
      fontWeight: 'bold',
      fontSize: '18px'
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px 8px',
      marginTop: '16px'
    },
    detailItem: {
      fontSize: '14px'
    },
    barcodeSection: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginTop: '24px'
    },
    uniqueNumber: {
      textAlign: 'center',
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#1f2937',
      letterSpacing: '2px',
      marginTop: '8px',
      fontWeight: 'bold'
    }
  };

  return (
    <div ref={ref} style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <div style={styles.logoSection}>
          <img src={ShrustiLogo} alt="Shrusti Logo" style={styles.logo} />
          <div style={styles.companyText}>
            <div>SHRUSTI</div>
            <div>CLOTHING</div>
          </div>
        </div>
        <h2 style={styles.wagesTitle}>WAGES</h2>
      </div>
      
      {/* Receipt Details */}
      <div style={styles.receiptDetails}>
        <div style={styles.dateIdRow}>
          <p style={styles.dateText}>{new Date(date).toLocaleDateString("en-GB")}</p>
          <p style={styles.idText}>{formattedId}</p>
        </div>
        <div style={styles.detailsGrid}>
          <p style={styles.detailItem}><strong>Supplier:</strong> {supplier_name}</p>
          <p style={styles.detailItem}><strong>Fabric type:</strong> {fabric_type}</p>
          <p style={styles.detailItem}><strong>Invoice No.:</strong> {invoice_no}</p>
          <p style={styles.detailItem}><strong>Color:</strong> {color || 'N/A'}</p>
          <p style={styles.detailItem}><strong>Weight:</strong> {weight_of_material} kg</p>
        </div>
      </div>
      
      {/* Barcode Section */}
      <div style={styles.barcodeSection}>
        <Barcode value={unique_number} width={1} height={40} displayValue={false} />
        <p style={styles.uniqueNumber}>
          {unique_number}
        </p>
      </div>
    </div>
  );
});

// AllSuppliers Component
const AllSuppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSupplierReceipts, setSelectedSupplierReceipts] = useState([]);
  const [viewingSupplierName, setViewingSupplierName] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateReceipts, setDuplicateReceipts] = useState([]);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState("");
  const [branchId, setBranchId] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [receiptToPrint, setReceiptToPrint] = useState(null);
  
  const receiptRef = useRef();

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

  // Function to find duplicates and filter unique records (ONLY NON-COMPLETED)
  const processReceipts = (receipts) => {
    const availableReceipts = receipts.filter(receipt => 
      !receipt.status || receipt.status !== 'cutting_completed'
    );

    // Group receipts by invoice_no
    const groupedByInvoice = availableReceipts.reduce((acc, receipt) => {
      const invoiceNo = receipt.invoice_no;
      if (!acc[invoiceNo]) {
        acc[invoiceNo] = [];
      }
      acc[invoiceNo].push(receipt);
      return acc;
    }, {});

    // Filter out duplicates (keep only first occurrence of each invoice_no)
    const uniqueReceipts = [];
    const duplicateInvoices = {};

    Object.keys(groupedByInvoice).forEach(invoiceNo => {
      const receiptsGroup = groupedByInvoice[invoiceNo];
      uniqueReceipts.push(receiptsGroup[0]);
      
      if (receiptsGroup.length > 1) {
        duplicateInvoices[invoiceNo] = receiptsGroup;
      }
    });

    return { uniqueReceipts, duplicateInvoices };
  };

  // Calculate total weight for invoice (including duplicates)
  const calculateInvoiceTotalWeight = (invoiceNo, allReceipts) => {
    const invoiceReceipts = allReceipts.filter(receipt => 
      receipt.invoice_no === invoiceNo && (!receipt.status || receipt.status !== 'cutting_completed')
    );
    return invoiceReceipts.reduce((total, receipt) => {
      const weight = parseFloat(receipt.weight_of_material) || 0;
      return total + weight;
    }, 0).toFixed(2);
  };

  // Handle clicking on duplicate invoice number with total weight
  const handleDuplicateClick = (invoiceNo, allReceipts) => {
    const availableReceipts = allReceipts.filter(receipt => 
      !receipt.status || receipt.status !== 'cutting_completed'
    );
    
    const duplicatesForInvoice = availableReceipts.filter(receipt => receipt.invoice_no === invoiceNo);
    setDuplicateReceipts(duplicatesForInvoice);
    setSelectedInvoiceNo(invoiceNo);
    setShowDuplicateModal(true);
  };

  // Calculate total weight for duplicate invoice
  const calculateTotalWeight = (receipts) => {
    return receipts.reduce((total, receipt) => {
      const weight = parseFloat(receipt.weight_of_material) || 0;
      return total + weight;
    }, 0).toFixed(2);
  };

  const handleViewStock = async (supplierId) => {
    setLoading(true);
    setError(null);
    const supplier = suppliers.find((s) => s.id === supplierId);
    setViewingSupplierName(supplier?.supplier_name);
    try {
      const res = await fetchWithAuth(`${apiBaseUrl}/api/receipts/by-supplier/${supplierId}`, { branchId });
      if (res) {
        setSelectedSupplierReceipts(res.data);
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

  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    setDuplicateReceipts([]);
    setSelectedInvoiceNo("");
  };
  
  const handlePrintReceipt = (receipt) => {
    setReceiptToPrint(receipt);
    setShowStockModal(false);
    setShowPrintModal(true);
  };
  
  // PDF generation logic
  const handleGeneratePDF = async () => {
    if (!receiptRef.current) return;
    
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${receiptToPrint.unique_number}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    }
  };

  if (!branchId || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-800 text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  // Process receipts to handle duplicates (only available receipts)
  const { uniqueReceipts, duplicateInvoices } = processReceipts(selectedSupplierReceipts);

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

      {/* Main Stock Modal - REMOVED ACTION COLUMN */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto text-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Available Stock for {viewingSupplierName}</h2>
              <button
                onClick={handleCloseModal}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>

            {uniqueReceipts.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Only showing available receipts (cutting not completed)
                  </p>
                </div>
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-4 py-2 text-left">S.No.</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Unique Number</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Invoice No</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Color</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Weight</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueReceipts.map((receipt, idx) => {
                      const isDuplicate = duplicateInvoices[receipt.invoice_no];
                      const totalWeight = calculateInvoiceTotalWeight(receipt.invoice_no, selectedSupplierReceipts);
                      
                      return (
                        <tr key={receipt.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2">{idx + 1}</td>
                          <td className="border border-gray-200 px-4 py-2">{formatDate(receipt.date)}</td>
                          <td className="border border-gray-200 px-4 py-2">{receipt.unique_number}</td>
                          <td className="border border-gray-200 px-4 py-2">
                            {isDuplicate ? (
                              <button
                                onClick={() => handleDuplicateClick(receipt.invoice_no, selectedSupplierReceipts)}
                                className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer underline"
                                title="Click to view all duplicate entries"
                              >
                                {receipt.invoice_no}
                              </button>
                            ) : (
                              <span className="font-bold">{receipt.invoice_no}</span>
                            )}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">{receipt.color || 'N/A'}</td>
                          <td className="border border-gray-200 px-4 py-2">
                            {isDuplicate ? (
                              <span className="font-bold text-green-600">
                                Total: {totalWeight} kg
                              </span>
                            ) : (
                              <span>{receipt.weight_of_material} kg</span>
                            )}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            <span className="text-green-600 font-semibold">Available</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500">No available stock records found for this supplier.</div>
            )}
          </div>
        </div>
      )}

      {/* Duplicate Records Modal with Total Weight */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 overflow-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto text-gray-800">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">
                  Duplicate Records for Invoice: <span className="font-bold">{selectedInvoiceNo}</span>
                </h2>
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-lg font-semibold text-yellow-800">
                    Total Weight: <span className="text-2xl text-yellow-900 font-bold">{calculateTotalWeight(duplicateReceipts)} kg</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseDuplicateModal}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>

            {duplicateReceipts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-4 py-2 text-left">S.No.</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Unique Number</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Invoice No</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Color</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Weight</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicateReceipts.map((receipt, idx) => (
                      <tr key={receipt.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-2">{idx + 1}</td>
                        <td className="border border-gray-200 px-4 py-2">{formatDate(receipt.date)}</td>
                        <td className="border border-gray-200 px-4 py-2">{receipt.unique_number}</td>
                        <td className="border border-gray-200 px-4 py-2 font-bold text-blue-600">
                          {receipt.invoice_no}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">{receipt.color || 'N/A'}</td>
                        <td className="border border-gray-200 px-4 py-2 font-semibold">
                          {receipt.weight_of_material} kg
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <span className="text-green-600 font-semibold">Available</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-4 bg-gray-50 border-t-2 border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-700">Total Records: {duplicateReceipts.length}</span>
                    <span className="text-xl font-bold text-blue-600">
                      Total Weight: {calculateTotalWeight(duplicateReceipts)} kg
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">No duplicate records found.</div>
            )}
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && receiptToPrint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Print Receipt</h2>
            <div className="print-area">
              <ReceiptToPrint receiptData={receiptToPrint} ref={receiptRef} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowPrintModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Close
              </button>
              <button
                onClick={handleGeneratePDF}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllSuppliers;