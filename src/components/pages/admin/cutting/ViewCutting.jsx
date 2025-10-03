import React, { useState, useEffect, useRef, forwardRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// NOTE: Ensure VITE_API_BASE_URL is correctly defined in your environment
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Helper function to decode JWT token
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

// Helper function to format a date string
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString("en-GB");
  } catch (error) {
    return 'N/A';
  }
};

// Helper function to safely render values from API
const renderSafeValue = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  return String(value);
};

// Helper function to safely parse numbers
const parseNumber = (value) => {
  const parsed = parseFloat(value || 0);
  return isNaN(parsed) ? 0 : parsed;
};

// A simple modal to display messages instead of using alert()
const MessageModal = ({ message, onClose }) => {
  const modalStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    fontFamily: 'sans-serif',
  };

  const contentStyles = {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
  };

  const buttonStyles = {
    padding: '10px 20px',
    backgroundColor: '#0071bc',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '20px',
    fontWeight: 'bold',
  };

  return (
    <div style={modalStyles}>
      <div style={contentStyles}>
        <p style={{ fontSize: '1.125rem' }}>{message}</p>
        <button onClick={onClose} style={buttonStyles}>Close</button>
        </div>
    </div>
  );
};

// Payment Receipt Component - separated for clarity but kept in the same file
const PaymentReceipt = forwardRef(({ paymentData, operatorEntries, receiptDetails }, ref) => {
  // Use a sample data object if no props are provided
  const sampleData = {
    operator_name: 'Sample Operator',
    operation: 'Cutting',
    paid_date: new Date().toISOString(),
    gross_amount: 5000,
    deducted_advance: 500,
    paid_amount: 4500,
    payment_type: 'Cash'
  };

  const sampleEntries = [
    { date: '2025-09-15', product_name: 'T-Shirt', pieces: 100, gross_amount: 1500, weight_of_fabric: 10 },
    { date: '2025-09-16', product_name: 'Jeans', pieces: 50, gross_amount: 2500, weight_of_fabric: 20 },
    { date: '2025-09-17', product_name: 'Jacket', pieces: 20, gross_amount: 1000, weight_of_fabric: 15 },
  ];

  if (!paymentData && !receiptDetails) {
    return (
      <div ref={ref} style={{
        width: "210mm",
        height: "297mm",
        padding: "20mm",
        backgroundColor: "#ffffff",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "Arial, sans-serif"
      }}>
        <div style={{
          padding: '20px',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '18px',
          textAlign: 'center'
        }}>
          No payment data available - Using sample data for demo
        </div>
      </div>
    );
  }

  const data = paymentData || receiptDetails || sampleData;
  const entries = operatorEntries || sampleEntries;

  const totalGrossFromEntries = entries && Array.isArray(entries)
    ? entries.reduce((sum, entry) => {
      return sum + parseNumber(entry.gross_amount || entry.amount || entry.total_amount);
    }, 0)
    : parseNumber(data.grossAmount || data.gross_amount || 0);

  const totalPiecesFromEntries = entries && Array.isArray(entries)
    ? entries.reduce((sum, entry) => {
      return sum + parseNumber(entry.pieces || entry.total_pieces || entry.quantity || entry.qty || entry.piece_count);
    }, 0)
    : parseNumber(data.total_pieces || 0); // Use total pieces from receipt data if available

  // Accessing weight property safely (using data.total_weight for paid receipt summary)
  const totalWeightFromEntries = entries && Array.isArray(entries)
    ? entries.reduce((sum, entry) => {
      return sum + parseNumber(entry.weight || entry.total_weight || entry.weight_of_fabric);
    }, 0)
    : parseNumber(data.total_weight || 0); // Use total weight from receipt data if available

  // Calculate cutting average
  const cuttingAverage = totalPiecesFromEntries > 0 ? totalWeightFromEntries / totalPiecesFromEntries : 0;

  // deductionAmount is calculated as (Gross - Payable)
  // Positive value means deduction (Advance Repayment).
  // Negative value means Payable > Gross (New Advance Given).
  const deductionAmount = parseNumber(data.deductAdvance || data.deducted_advance);
  const finalPayableAmount = parseNumber(data.paidAmount || data.paid_amount || (totalGrossFromEntries - deductionAmount)); // Use paid_amount if available, otherwise calculate

  // ✅ FIX 1: Determine the correct label for the deduction row based on sign
  const advanceLabel = deductionAmount >= 0 ? 'Advance Deduction' : 'New Advance Given';

  const styles = {
    container: {
      width: "210mm",
      minHeight: "297mm",
      padding: "25mm 30mm",
      backgroundColor: "#ffffff",
      color: "#000",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      lineHeight: "1.3"
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "30px",
      paddingBottom: "15px",
      borderBottom: "2px solid #000"
    },
    logoSection: {
      display: "flex",
      alignItems: "center"
    },
    logoBox: {
      width: '60px',
      height: '60px',
      marginRight: '15px'
    },
    logoImage: {
      width: '100%',
      height: '100%',
      objectFit: 'contain'
    },
    companyText: {
      fontSize: "24px",
      fontWeight: "bold",
      textTransform: "uppercase",
      lineHeight: "1.2",
      letterSpacing: "1px"
    },
    wagesTitle: {
      fontSize: "48px",
      fontWeight: "bold",
      color: "#2563eb",
      letterSpacing: "3px",
      marginTop: "10px"
    },
    staffInfo: {
      marginBottom: "25px",
      fontSize: "16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    },
    staffLeft: {
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    },
    staffRight: {
      fontSize: "16px",
      fontWeight: "normal"
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "30px",
      border: "2px solid #000"
    },
    tableHeader: {
      backgroundColor: "#f8f9fa",
      fontWeight: "bold"
    },
    tableCell: {
      padding: "10px 8px",
      border: "1px solid #000",
      fontSize: "12px", // Reduced font size to accommodate more columns
      textAlign: "center"
    },
    summarySection: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginTop: "40px",
      paddingTop: "20px",
      borderTop: "2px solid #000"
    },
    thankYouText: {
      fontSize: "16px",
      fontWeight: "bold",
      lineHeight: "1.4",
      flex: 1
    },
    amountSection: {
      minWidth: "300px",
      fontSize: "16px"
    },
    amountRow: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "6px",
      paddingBottom: "3px"
    },
    totalRow: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "18px",
      fontWeight: "bold",
      paddingTop: "8px",
      paddingBottom: "8px",
      borderTop: "2px solid #000",
      borderBottom: "2px solid #000",
      marginTop: "8px",
      marginBottom: "15px",
      color: "#2563eb"
    },
    paymentMethod: {
      textAlign: "right",
      fontSize: "14px",
      marginTop: "10px"
    },
    signatureSection: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "60px",
      fontSize: "14px"
    },
    signatureBox: {
      textAlign: "center",
      width: "200px"
    },
    dotLine: {
      borderBottom: "2px dotted #000",
      width: "100%",
      height: "1px",
      marginTop: "40px",
      marginBottom: "10px"
    }
  };

  return (
    <div ref={ref} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoSection}>
          <div style={styles.logoBox}>
            <img 
              src="/Shrusti_logo.png" 
              alt="Shrusti Clothing Logo"
              style={styles.logoImage}
            />
          </div>
          <div style={styles.companyText}>
            SHRUSTI<br />
            CLOTHING
          </div>
        </div>
        <div style={styles.wagesTitle}>
          WAGES
          <div style={{ fontSize: '14px', fontWeight: 'normal', marginTop: '5px', color: '#666' }}>
            (Cutting Operation)
          </div>
        </div>
      </div>

      {/* Staff Info */}
      <div style={styles.staffInfo}>
        <div style={styles.staffLeft}>
          <div><strong>Staff Name - </strong>{renderSafeValue(data.operatorName || data.operator_name || 'N/A')}</div>
          <div><strong>Operation Name - </strong>{renderSafeValue(data.operation || 'Cutting')}</div>
        </div>
        <div style={styles.staffRight}>
          <div><strong>Date: </strong>{formatDate(data.paidDate || data.payment_date)}</div>
        </div>
        </div>

      {/* Work Details Table */}
      <div>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableCell}>S. No.</th>
              <th style={styles.tableCell}>Date</th>
              <th style={styles.tableCell}>Product Name</th>
              <th style={styles.tableCell}>Qty(pcs)</th>
              <th style={styles.tableCell}>Weight(kgs)</th>
              <th style={styles.tableCell}>Rate (₹/pc)</th>
              <th style={styles.tableCell}>Gross Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries && entries.length > 0 ? (
              entries.map((entry, index) => {
                const pieces = parseNumber(entry.pieces || entry.total_pieces || entry.quantity || entry.qty || entry.piece_count);
                const grossAmount = parseNumber(entry.gross_amount || entry.amount || entry.total_amount);
                const ratePerPiece = pieces > 0 ? (grossAmount / pieces) : 0;
                // Using weight_of_fabric field, which is now fetched from backend
                const weight = parseNumber(entry.weight || entry.total_weight || entry.weight_of_fabric); 

                return (
                  <tr key={entry.id || index}>
                    <td style={styles.tableCell}>{index + 1}</td>
                    <td style={styles.tableCell}>
                      {formatDate(entry.date || entry.created_at || entry.entry_date)}
                    </td>
                    <td style={styles.tableCell}>
                      {renderSafeValue(entry.product_name || entry.productName || entry.product)}
                    </td>
                    <td style={styles.tableCell}>
                      {renderSafeValue(pieces)}
                    </td>
                    <td style={styles.tableCell}>
                      {weight.toFixed(2)}
                    </td>
                    <td style={styles.tableCell}>
                      ₹{ratePerPiece.toFixed(2)}
                    </td>
                    <td style={styles.tableCell}>
                      ₹{grossAmount.toFixed(2)}
                    </td>
                  </tr>
                )})
            ) : (
              <tr>
                <td colSpan={7} style={{
                  ...styles.tableCell,
                  padding: "30px",
                  color: "#666",
                  fontStyle: "italic"
                }}>
                  No work entries found
                </td>
              </tr>
            )}
            {entries && entries.length > 0 && (
              <tr style={{ ...styles.tableHeader, backgroundColor: '#e8f4f8', borderTop: '2px solid #000' }}>
                <td colSpan={3} style={{ ...styles.tableCell, textAlign: 'right', fontSize: '14px' }}><strong>TOTALS:</strong></td>
                <td style={{ ...styles.tableCell, fontSize: '14px', color: '#16a34a' }}><strong>{totalPiecesFromEntries}</strong></td>
                <td style={{ ...styles.tableCell, fontSize: '14px', color: '#16a34a' }}><strong>{totalWeightFromEntries.toFixed(2)}</strong></td>
                <td style={{ ...styles.tableCell }}>-</td>
                <td style={{ ...styles.tableCell, fontSize: '14px', color: '#16a34a' }}><strong>₹{totalGrossFromEntries.toFixed(2)}</strong></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div style={styles.summarySection}>
        <div style={styles.thankYouText}>
          <div>Thank you for</div>
          <div>Working with Shrusti</div>
          <div>Clothing</div>
          {/* <div style={{ marginTop: '15px' }}>
            <strong>Cutting Average:</strong> 
            <span style={{ color: '#2563eb' }}>{cuttingAverage.toFixed(3)} kg/pc</span>
          </div> */}
        </div>

        <div style={styles.amountSection}>
          <div style={styles.amountRow}>
            <span>Total Gross Amount(Rs.):</span>
            <span style={{ fontWeight: 'bold' }}>₹{totalGrossFromEntries.toFixed(2)}</span>
          </div>

          <div style={styles.amountRow}>
            {/* ✅ FIX 1: Conditional label based on the sign of deductionAmount */}
            <span>{advanceLabel}:</span> 
            <span style={{ fontWeight: 'bold', color: deductionAmount >= 0 ? '#dc2626' : '#16a34a' }}>
              {deductionAmount >= 0 ? '-' : '+'}₹{Math.abs(deductionAmount).toFixed(2)}
            </span>
          </div>

          <div style={styles.amountRow}>
            <span>Payable Amount (Rs.):</span>
            <span style={{ fontWeight: 'bold' }}>₹{finalPayableAmount.toFixed(2)}</span>
          </div>

          <div style={styles.totalRow}>
            <span>Total Paid:</span>
            <span>₹{finalPayableAmount.toFixed(2)}</span>
          </div>

          <div style={styles.paymentMethod}>
            Paid by {renderSafeValue(data.paymentType || data.payment_type || 'CASH').toUpperCase()}
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div style={styles.signatureSection}>
        <div style={styles.signatureBox}>
          <div style={styles.dotLine}></div>
          <div><strong>Operation Manager Sign.</strong></div>
        </div>
        <div style={styles.signatureBox}>
          <div style={styles.dotLine}></div>
          <div><strong>Operator Sign.</strong></div>
        </div>
      </div>
    </div>
  );
});

PaymentReceipt.displayName = 'PaymentReceipt';


// Main ViewCutting Component
const ViewCutting = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('unpaid');
  const [unpaidOperators, setUnpaidOperators] = useState([]);
  const [paidReceipts, setPaidReceipts] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [operatorEntries, setOperatorEntries] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaidReceiptModal, setShowPaidReceiptModal] = useState(false);
  const [showEntriesModal, setShowEntriesModal] = useState(false);
  const [branchId, setBranchId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [receiptToView, setReceiptToView] = useState(null);
  const [message, setMessage] = useState(null);

  // Payment processing states
  const [pendingAdvance, setPendingAdvance] = useState(0);
  const [deductAdvance, setDeductAdvance] = useState(0);
  const [payableAmount, setPayableAmount] = useState(0);
  const [grossAmount, setGrossAmount] = useState(0);
  const [paymentType, setPaymentType] = useState('Cash');

  // Ref for PDF generation
  const receiptRef = useRef();

  // Get branch ID from token
  useEffect(() => {
    const token = localStorage.getItem('branchToken');
    if (token) {
      const decoded = decodeJwt(token);
      if (decoded?.branch_id) {
        setBranchId(decoded.branch_id);
      }
    }
  }, []);

  // Fetch unpaid operators
  const fetchUnpaidOperators = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('branchToken');
      const response = await axios.get(
        `${apiBaseUrl}/api/cutting-entry/unpaid-wages/cutting`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { branchId }
        }
      );
      // NOTE: The API response should ideally aggregate total_pieces, total_weight, gross_amount, and pending_advance per operator.
      setUnpaidOperators(response.data);
    } catch (error) {
      console.error('Error fetching unpaid operators:', error);
      setUnpaidOperators([]);
      setMessage('Failed to fetch unpaid wages. Please check your network and API.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch paid receipts
  const fetchPaidReceipts = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('branchToken');
      const response = await axios.get(
        `${apiBaseUrl}/api/cutting-entry/paid-receipts/cutting`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { branchId }
        }
      );
      setPaidReceipts(response.data);
    } catch (error) {
      console.error('Error fetching paid receipts:', error);
      setPaidReceipts([]);
      setMessage('Failed to fetch paid receipts. Please check your network and API.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch entries for a specific operator (used for EntriesModal)
    const fetchOperatorEntries = async (operatorName, initialData) => {
    if (!branchId) {
      setMessage('Branch ID missing. Cannot fetch entries.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('branchToken');
      const response = await axios.get(
        `${apiBaseUrl}/api/cutting-entry/wage-entries/${operatorName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { branchId, operation: 'cutting' }
        }
      );

      const entriesData = response.data;

      // Calculate derived metrics from fetched entries to update modal state
      const calculatedGross = entriesData.reduce((sum, entry) => sum + parseNumber(entry.gross_amount), 0);

      // Use the data passed from the main table (initialData)
      const pendingAdvanceForModal = parseNumber(initialData?.pending_advance || 0);
      // Use the gross_amount passed from the table, or the newly calculated one if needed
      const grossAmountForModal = parseNumber(initialData?.gross_amount || calculatedGross); 
      const payableAmountForModal = grossAmountForModal - pendingAdvanceForModal;


      setOperatorEntries(entriesData);
      setSelectedOperator({
        operator_name: operatorName,
        gross_amount: grossAmountForModal,
        pending_advance: pendingAdvanceForModal,
        payable_amount: payableAmountForModal
      });

      setShowEntriesModal(true);
    } catch (error) {
      console.error('Error fetching operator entries:', error);
      setOperatorEntries([]);
      setMessage('Failed to fetch operator entries.');
    } finally {
      setLoading(false);
    }
  };

  // Print entries function (Matches the Paid Receipt style and format)
  const handlePrintEntries = () => {
    const printWindow = window.open('', '_blank');

    // Calculate total weight, total pieces, and total amount
    const totalPieces = operatorEntries.reduce((sum, entry) => sum + (parseInt(entry.pieces) || 0), 0);
    const totalGrossAmount = operatorEntries.reduce((sum, entry) => sum + (parseFloat(entry.gross_amount) || 0), 0);
    const totalWeight = operatorEntries.reduce((sum, entry) => sum + (parseNumber(entry.weight || entry.total_weight || entry.weight_of_fabric) || 0), 0);
    const cuttingAvg = totalPieces > 0 ? (totalWeight / totalPieces) : 0;

    // Use selectedOperator's summary data for printing
    const payableAmountPrint = parseNumber(selectedOperator.payable_amount);
    
    // Calculate Deduction based on Gross - Payable
    const calculatedDeduction = totalGrossAmount - payableAmountPrint; 

    // Determine the correct label for the deduction row in the print view
    const advanceLabelPrint = calculatedDeduction >= 0 ? 'Advance Deduction' : 'New Advance Given';

    // --- HTML/CSS matching the PaymentReceipt Component ---
    const entriesTableHTML = `
        <html>
        <head>
            <title>Work Entries - ${selectedOperator?.operator_name}</title>
            <style>
                /* BASE STYLES matching PaymentReceipt CSS-in-JS */
                .container {
                    width: 190mm; /* A4 width minus padding */
                    min-height: 270mm;
                    padding: 25mm 30mm;
                    color: #000;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    line-height: 1.3;
                    margin: 0 auto;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 30px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #000;
                }
                .logo-section { display: flex; align-items: center; }
                .logo-box { width: 60px; height: 60px; margin-right: 15px; }
                .logo-image { width: 100%; height: 100%; object-fit: contain; }
                .company-text { font-size: 24px; font-weight: bold; text-transform: uppercase; line-height: 1.2; letter-spacing: 1px; }
                .wages-title { font-size: 48px; font-weight: bold; color: #2563eb; letter-spacing: 3px; margin-top: 10px; text-align: right;}
                .wages-subtitle { font-size: 14px; font-weight: normal; margin-top: 5px; color: #666; }
                
                .staff-info { margin-bottom: 25px; font-size: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
                .staff-left { display: flex; flex-direction: column; gap: 8px; }

                /* TABLE STYLES */
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 2px solid #000; }
                .table-header { background-color: #f8f9fa; font-weight: bold; }
                .table-cell { padding: 10px 8px; border: 1px solid #000; font-size: 12px; text-align: center; }
                
                /* TOTAL ROW STYLES (inside table) */
                .table-total-row { background-color: #e8f4f8; border-top: 2px solid #000; font-weight: bold; }
                .table-total-row td:nth-child(1) { text-align: right; font-size: 14px; }
                .table-total-row td:nth-child(2),
                .table-total-row td:nth-child(3),
                .table-total-row td:nth-child(4) { color: #16a34a; font-size: 14px; }

                /* SUMMARY SECTION */
                .summary-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #000;
                }
                .thank-you-text {
                    font-size: 16px;
                    font-weight: bold;
                    line-height: 1.4;
                    flex: 1;
                }
                .amount-section { min-width: 300px; font-size: 16px; }
                .amount-row { display: flex; justify-content: space-between; margin-bottom: 6px; padding-bottom: 3px; }
                
                /* TOTAL PAID SECTION STYLES (The key changes are here) */
                .total-paid-wrapper {
                    border-top: 2px solid #000;
                    margin-top: 8px;
                    padding-top: 8px;
                }
                .total-row-paid {
                    display: flex;
                    justify-content: space-between;
                    font-size: 18px;
                    font-weight: bold;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #000;
                    color: #2563eb;
                }
                .payment-method { text-align: right; font-size: 14px; margin-top: 5px; }

                .signature-section { display: flex; justify-content: space-between; margin-top: 60px; font-size: 14px; }
                .signature-box { text-align: center; width: 200px; }
                .dot-line { border-bottom: 2px dotted #000; width: 100%; height: 1px; margin-top: 40px; margin-bottom: 10px; }

                /* Print Specific Styles */
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body { margin: 0; }
                    .container {
                        width: 210mm;
                        min-height: 297mm;
                        padding: 15mm 20mm; /* Reduced padding for print */
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                
                <div class="header">
                    <div class="logo-section">
                        <div class="logo-box">
                            <img src="/Shrusti_logo.png" alt="Shrusti Clothing Logo" style="width: 100%; height: 100%; object-fit: contain;" />
                        </div>
                        <div class="company-text">SHRUSTI<br />CLOTHING</div>
                    </div>
                    <div class="wages-title">
                        WAGES
                        <div class="wages-subtitle">(Cutting Operation)</div>
                    </div>
                </div>

                <div class="staff-info">
                    <div class="staff-left">
                        <div>**Staff Name -** ${renderSafeValue(selectedOperator?.operator_name)}</div>
                        <div>**Operation Name -** Cutting</div>
                    </div>
                    <div class="staff-right">
                        <div>**Date:** ${formatDate(new Date().toISOString())}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr class="table-header">
                            <th class="table-cell">S. No.</th>
                            <th class="table-cell">Date</th>
                            <th class="table-cell">Product Name</th>
                            <th class="table-cell">Qty(pcs)</th>
                            <th class="table-cell">Weight(kgs)</th>
                            <th class="table-cell">Rate (₹/pc)</th>
                            <th class="table-cell">Gross Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${operatorEntries.map((entry, index) => {
                            const pieces = parseNumber(entry.pieces || entry.total_pcs);
                            const grossAmount = parseNumber(entry.gross_amount);
                            const ratePerPiece = pieces > 0 ? (grossAmount / pieces) : 0;
                            const weight = parseNumber(entry.weight || entry.total_weight || entry.weight_of_fabric);

                            return `
                                <tr>
                                    <td class="table-cell">${index + 1}</td>
                                    <td class="table-cell">${formatDate(entry.date || entry.created_at || entry.entry_date)}</td>
                                    <td class="table-cell">${renderSafeValue(entry.product_name)}</td>
                                    <td class="table-cell">${renderSafeValue(pieces)}</td>
                                    <td class="table-cell">${weight.toFixed(2)}</td>
                                    <td class="table-cell">₹${ratePerPiece.toFixed(2)}</td>
                                    <td class="table-cell">₹${grossAmount.toFixed(2)}</td>
                                </tr>
                            `;
                        }).join('')}
                        
                        <tr class="table-total-row">
                            <td colspan="3" class="table-cell" style="text-align: right;">**TOTALS:**</td>
                            <td class="table-cell">${totalPieces}</td>
                            <td class="table-cell">${totalWeight.toFixed(2)}</td>
                            <td class="table-cell">-</td>
                            <td class="table-cell">₹${totalGrossAmount.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="summary-section">
                    <div class="thank-you-text">
                        <div>Thank you for</div>
                        <div>Working with Shrusti</div>
                        <div>Clothing</div>
                       
                    </div>

                    <div class="amount-section">
                        <div class="amount-row">
                            <span>Total Gross Amount(Rs.):</span>
                            <span style="font-weight: bold;">₹${totalGrossAmount.toFixed(2)}</span>
                        </div>

                        <div class="amount-row">
                            <span>${advanceLabelPrint}:</span>
                            <span style="font-weight: bold; color: ${calculatedDeduction >= 0 ? '#dc2626' : '#16a34a'};">
                                ${calculatedDeduction >= 0 ? '-' : '+'}₹${Math.abs(calculatedDeduction).toFixed(2)}
                            </span>
                        </div>
                        
                        <div class="amount-row">
                            <span>Payable Amount (Rs.):</span>
                            <span style="font-weight: bold;">₹${payableAmountPrint.toFixed(2)}</span>
                        </div>
                        
                        <div class="total-paid-wrapper">
                            <div class="total-row-paid">
                                <span>Total Paid:</span>
                                <span>₹${payableAmountPrint.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="payment-method">
                            Paid by CASH
                        </div>
                    </div>
                </div>

                <div class="signature-section">
                    <div class="signature-box">
                        <div class="dot-line"></div>
                        <div>**Operation Manager Sign.**</div>
                    </div>
                    <div class="signature-box">
                        <div class="dot-line"></div>
                        <div>**Operator Sign.**</div>
                    </div>
                </div>
                
            </div>
            
            <p style="text-align: center; margin-top: 20px; font-size: 10px; color: #999;">
                (This is an unpaid wages entry view, not a final payment receipt.)
            </p>
        </body>
        </html>
    `;

    printWindow.document.write(entriesTableHTML);
    printWindow.document.close();
    printWindow.print();
  };

  // Get entries when Pay & Receipt is clicked
  const handlePayAndReceipt = async (operator) => {
    if (!branchId) {
      setMessage('Branch ID missing. Cannot process payment.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('branchToken');
      // Fetch entries
      const entriesResponse = await axios.get(
        `${apiBaseUrl}/api/cutting-entry/wage-entries/${operator.operator_name}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { branchId, operation: 'cutting' }
        }
      );
      const entriesData = entriesResponse.data;

      // Fetch pending advance balance
      const staffResponse = await axios.get(
        `${apiBaseUrl}/api/cutting-entry/pending-balance`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { staff_name: operator.operator_name, branchId }
        }
      );

      setOperatorEntries(entriesData);
      setSelectedOperator(operator);
      const gross = parseNumber(operator.gross_amount);
      setGrossAmount(gross);

      if (staffResponse.data.success) {
        const pending = parseNumber(staffResponse.data.pendingBalance);
        setPendingAdvance(pending);
        // Automatically deduct up to the gross amount
        const defaultDeductAdvance = Math.min(pending, gross);
        setDeductAdvance(defaultDeductAdvance);
        setPayableAmount(gross - defaultDeductAdvance);
      } else {
        setPendingAdvance(0);
        setDeductAdvance(0);
        setPayableAmount(gross);
      }
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error fetching operator data:', error);
      setMessage('Error fetching operator data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
    * IMPORTANT: Handle payable amount change and auto-calculate advance deduction.
    */
  const handlePayableAmountChange = (value) => {
    const payable = parseNumber(value);
    setPayableAmount(payable);

    // Recalculate advance deduction: deductAdvance = grossAmount - payableAmount
    // A positive deductAdvance means it was deducted/repaid to company.
    // A negative deductAdvance means a new advance was given by the company.
    const newDeductAdvance = parseNumber(grossAmount) - payable;
    setDeductAdvance(newDeductAdvance);
  };

  // Process payment and generate receipt
  const processPayment = async () => {
    if (!selectedOperator || !operatorEntries.length) {
      setMessage('No operator or entries found.');
      return;
    }
    if (!branchId) {
      setMessage('Branch ID missing.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('branchToken');
      const entryIds = operatorEntries.map(entry => entry.id);

      if (entryIds.length === 0) {
        setMessage('No entries to process.');
        setLoading(false);
        return;
      }

      const paymentData = {
        operatorName: selectedOperator.operator_name,
        operation: 'cutting',
        entryIds: entryIds,
        grossAmount: parseNumber(grossAmount),
        pendingAdvance: parseNumber(pendingAdvance),
        deductAdvance: parseNumber(deductAdvance),
        payableAmount: parseNumber(payableAmount),
        paymentType: paymentType,
        branchId: branchId
      };

      await axios.post(
        `${apiBaseUrl}/api/cutting-entry/process-payment`,
        paymentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowPaymentModal(false);

      // Calculate totals for the receipt
      const totalPieces = operatorEntries.reduce((sum, entry) => sum + parseNumber(entry.pieces || entry.total_pcs), 0);
      // Calculate total_weight from fetched entries for the receipt data
      const totalWeight = operatorEntries.reduce((sum, entry) => sum + parseNumber(entry.weight || entry.total_weight || entry.weight_of_fabric), 0);
      

      // Create proper receipt data structure for PDF generation
      const receiptDataForPdf = {
        operator_name: selectedOperator.operator_name,
        operatorName: selectedOperator.operator_name,
        operation: 'cutting',
        paid_date: new Date().toISOString(),
        payment_date: new Date().toISOString(),
        paidDate: new Date().toISOString(),
        gross_amount: parseNumber(grossAmount),
        grossAmount: parseNumber(grossAmount),
        total_pieces: totalPieces, // Added for calculation consistency
        total_weight: totalWeight, // Added total weight for cutting average calculation
        deducted_advance: parseNumber(deductAdvance), // This will be used by PaymentReceipt component
        deductAdvance: parseNumber(deductAdvance), // This will be used by PaymentReceipt component
        paid_amount: parseNumber(payableAmount),
        paidAmount: parseNumber(payableAmount),
        payment_type: paymentType,
        paymentType: paymentType
      };

      setReceiptToView(receiptDataForPdf);
      setShowPaidReceiptModal(true);

      fetchUnpaidOperators();
      fetchPaidReceipts();
      setSelectedOperator(null);

    } catch (error) {
      console.error('Error processing payment:', error);
      let errorMessage = 'Error processing payment. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      if (error.response?.data?.details) {
        errorMessage += ' Details: ' + error.response.data.details;
      }
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // View an existing paid receipt
  const handleViewReceipt = async (receiptId) => {
    if (!branchId) {
      setMessage('Branch ID missing. Cannot view receipt.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('branchToken');
      
      // ✅ FIX 2: Encode the receiptId to prevent routing issues on the live server
      const encodedReceiptId = encodeURIComponent(receiptId); 

      const response = await axios.get(
        `${apiBaseUrl}/api/cutting-entry/receipt/${encodedReceiptId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { branchId }
        }
      );
      const receiptData = response.data.receiptDetails;
      const entriesData = response.data.entries;

      setReceiptToView(receiptData);
      setOperatorEntries(entriesData);
      setShowPaidReceiptModal(true);
    } catch (error) {
      console.error('Error fetching receipt details:', error);
      setMessage('Failed to fetch receipt details. Please check the network for API error.');
    } finally {
      setLoading(false);
    }
  };

  // Generate receipt PDF
  const handleGeneratePDF = async () => {
    if (!receiptRef.current) {
      console.error('Receipt component ref is not available.');
      return;
    }

    try {
      // Temporarily set a specific style to ensure logo loads (if in same domain) and layout is right
      const receiptElement = receiptRef.current;
      const originalWidth = receiptElement.style.width;
      const originalPadding = receiptElement.style.padding;
      receiptElement.style.width = '210mm'; // Ensure fixed width for PDF generation consistency
      receiptElement.style.padding = '15mm'; // Smaller margin for better fit

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true, // Important for loading images like the logo
        logging: true
      });

      // Restore original styles after capture
      receiptElement.style.width = originalWidth;
      receiptElement.style.padding = originalPadding;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // Add image, ensuring it fits page height (may require multiple pages if too long)
      let heightLeft = pdfHeight;
      let position = 0;
      let pageNumber = 1;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
        pageNumber++;
      }

      pdf.save(`Payment_Receipt_${receiptToView.operator_name}_${new Date().toDateString()}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      setMessage('Failed to generate PDF.');
    }
  };


  // Initial data fetch
  useEffect(() => {
    if (branchId) {
      fetchUnpaidOperators();
      fetchPaidReceipts();
    }
  }, [branchId]);

  // Filter operators and receipts based on search
  const filteredUnpaidOperators = unpaidOperators.filter(operator =>
    operator.operator_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group operators by name and identify duplicates
  const groupedOperators = filteredUnpaidOperators.reduce((acc, operator) => {
    const name = operator.operator_name;
    const pieces = parseInt(operator.total_pieces) || 0;
    // Use total_weight which is aggregated by the backend API
    const weight = parseFloat(operator.total_weight || 0); 
    const gross = parseFloat(operator.gross_amount) || 0;
    const advance = parseFloat(operator.pending_advance) || 0;

    if (!acc[name]) {
      acc[name] = {
        operator_name: name,
        entries: [],
        total_pieces: 0,
        total_weight: 0,
        gross_amount: 0,
        pending_advance: 0
      };
    }
    acc[name].entries.push(operator);
    acc[name].total_pieces = pieces; // The API returns the aggregate value, not a sum here
    acc[name].total_weight = weight; // The API returns the aggregate value, not a sum here
    acc[name].pending_advance = advance; 
    acc[name].gross_amount = gross; 
    return acc;
  }, {});

  const processedUnpaidOperators = Object.values(groupedOperators).map(group => ({
    ...group,
    isDuplicate: group.entries.length > 1,
    originalData: group.entries, // Store original entries for modal display
    cutting_avg: group.total_pieces > 0 ? (group.total_weight / group.total_pieces) : 0
  }));

  const filteredPaidReceipts = paidReceipts.filter(receipt =>
    receipt.operator_name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const containerStyles = {
    padding: '24px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
    fontFamily: 'sans-serif'
  };

  const headerStyles = {
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0071bc',
    marginBottom: '32px'
  };

  const controlsStyles = {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    alignItems: 'center',
    flexWrap: 'wrap'
  };

  const inputStyles = {
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    fontSize: '1rem',
    minWidth: '250px'
  };

  const buttonStyles = (isActive, color) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: 'bold',
    backgroundColor: isActive ? color : '#e5e7eb',
    color: isActive ? 'white' : '#374151',
    cursor: 'pointer'
  });

  const sectionTitleStyles = (color) => ({
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
    color: color,
    fontSize: '1.25rem',
    fontWeight: 'bold'
  });

  const tableContainerStyles = {
    overflowX: 'auto',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  };

  const tableStyles = {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1100px'
  };

  const tableHeaderStyles = (color) => ({
    backgroundColor: color,
    color: 'white'
  });

  const tableCellStyles = {
    padding: '16px',
    textAlign: 'left',
    fontSize: '14px'
  };

  const tableRowStyles = {
    borderBottom: '1px solid #e5e7eb'
  };

  const modalContainerStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalContentStyles = {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '800px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
  };

  return (
    <div style={containerStyles}>
      {/* Header */}
      <h1 style={headerStyles}>View Cutting by Operator</h1>

      {/* Controls */}
      <div style={controlsStyles}>
        <input
          type="text"
          placeholder="Search by staff name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={inputStyles}
        />
        <button
          onClick={() => setActiveTab('unpaid')}
          style={buttonStyles(activeTab === 'unpaid', '#dc2626')}
        >
          Unpaid Wages ({processedUnpaidOperators.length})
        </button>
        <button
          onClick={() => setActiveTab('paid')}
          style={buttonStyles(activeTab === 'paid', '#16a34a')}
        >
          Paid Wages ({filteredPaidReceipts.length})
        </button>
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#dbeafe',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 'bold',
          color: '#1d4ed8'
        }}>
          Operation: CUTTING
        </div>
      </div>

      {/* --- Unpaid Content --- */}
      {activeTab === 'unpaid' && (
        <div>
          <div style={sectionTitleStyles('#dc2626')}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#dc2626', borderRadius: '50%', marginRight: '8px' }}></span>
            Unpaid Cutting Wages
            <span style={{ marginLeft: '12px', color: '#6b7280', fontSize: '1rem' }}>
              {processedUnpaidOperators.length} operators with unpaid wages
            </span>
          </div>
          <div style={tableContainerStyles}>
            <table style={tableStyles}>
              <thead style={tableHeaderStyles('#0071bc')}>
                <tr style={{whiteSpace: 'nowrap'}}>
                  <th style={{ ...tableCellStyles, textAlign: 'left' }}>S. No.</th>
                  <th style={{ ...tableCellStyles, textAlign: 'left' }}>Operator Name</th>
                  <th style={{ ...tableCellStyles, textAlign: 'center' }}>Total Pieces</th>
                  <th style={{ ...tableCellStyles, textAlign: 'center' }}>Total Weight (kg)</th>
                  <th style={{ ...tableCellStyles, textAlign: 'center' }}>Cutting Avg (kg/pc)</th>
                  <th style={{ ...tableCellStyles, textAlign: 'right' }}>Gross Amount (₹)</th>
                  <th style={{ ...tableCellStyles, textAlign: 'right' }}>Pending Advance (₹)</th>
                  <th style={{ ...tableCellStyles, textAlign: 'right' }}>Net Payable (₹)</th> {/* Added Net Payable Column */}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" style={{ padding: '24px', textAlign: 'center' }}>
                      Loading...
                    </td>
                  </tr>
                ) : processedUnpaidOperators.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ padding: '24px', textAlign: 'center' }}>
                      No unpaid wages found
                    </td>
                  </tr>
                ) : (
                  processedUnpaidOperators.map((operator, index) => {
                    const grossAmountValue = parseNumber(operator.gross_amount);
                    const pendingAdvanceValue = parseNumber(operator.pending_advance);
                    const payable = grossAmountValue - pendingAdvanceValue;

                    return (
                      <tr key={operator.operator_name} style={{
                        ...tableRowStyles,
                        backgroundColor: operator.isDuplicate ? '#fef3c7' : 'transparent'
                      }}>
                        <td style={tableCellStyles}>{index + 1}</td>
                        <td
                          style={{
                            ...tableCellStyles,
                            color: operator.isDuplicate ? '#d97706' : '#2563eb',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onClick={() => fetchOperatorEntries(operator.operator_name, {
                            gross_amount: operator.gross_amount,
                            pending_advance: operator.pending_advance,
                            payable_amount: payable
                          })} // Pass operator summary data
                          title={operator.isDuplicate ? `Duplicate entries found (${operator.entries.length} entries)` : 'Click to view entries'}
                        >
                          {operator.operator_name}
                          {operator.isDuplicate && (
                            <span style={{
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              marginLeft: '8px',
                              fontWeight: 'bold'
                            }}>
                              {operator.entries.length}x
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            ...tableCellStyles,
                            textAlign: 'center',
                            color: '#16a34a',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                          onClick={() => fetchOperatorEntries(operator.operator_name, {
                            gross_amount: operator.gross_amount,
                            pending_advance: operator.pending_advance,
                            payable_amount: payable
                          })}
                        >
                          {operator.total_pieces}
                        </td>
                        <td style={{ ...tableCellStyles, textAlign: 'center' }}>
                          {operator.total_weight.toFixed(2)}
                        </td>
                        <td style={{ ...tableCellStyles, textAlign: 'center', fontWeight: 'bold', color: '#0071bc' }}>
                          {operator.cutting_avg.toFixed(3)}
                        </td>
                        <td style={{ ...tableCellStyles, textAlign: 'right' }}>₹{grossAmountValue.toFixed(2)}</td>
                        <td style={{
                          ...tableCellStyles,
                          textAlign: 'right',
                          color: pendingAdvanceValue >= 0 ? '#dc2626' : '#16a34a',
                          fontWeight: 'bold'
                        }}>
                          {pendingAdvanceValue >= 0 ? '₹' + pendingAdvanceValue.toFixed(2) : '₹' + Math.abs(pendingAdvanceValue).toFixed(2)}
                        </td>
                        <td style={{
                          ...tableCellStyles,
                          textAlign: 'right',
                          color: payable >= 0 ? '#16a34a' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          ₹{Math.abs(payable).toFixed(2)}
                        </td>
                        <td style={{ ...tableCellStyles, textAlign: 'center' }}>
                          <button
                            onClick={() => handlePayAndReceipt(operator)}
                            disabled={loading}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#16a34a',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: 'bold'
                            }}
                          >
                            💰 Pay & Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Paid Content --- */}
      {activeTab === 'paid' && (
        <div>
          <div style={sectionTitleStyles('#16a34a')}>
            <span style={{ fontWeight: 'bold' }}>Paid Cutting Wages</span>
            <span style={{ marginLeft: '10px', color: '#6b7280' }}>
              {filteredPaidReceipts.length} total receipts
            </span>
          </div>
          <div style={tableContainerStyles}>
            <table style={tableStyles}>
              <thead style={tableHeaderStyles('#16a34a')}>
                <tr style={{whiteSpace: 'nowrap'}}>
                  <th style={{ ...tableCellStyles, textAlign: 'left' }}>S. No.</th>
                  <th style={{ ...tableCellStyles, textAlign: 'left' }}>Operator Name</th>
                  <th style={{ ...tableCellStyles, textAlign: 'center' }}>Total Pieces</th>
                  <th style={{ ...tableCellStyles, textAlign: 'right' }}>Gross Amount (₹)</th>
                  <th style={{ ...tableCellStyles, textAlign: 'right' }}>Paid Amount (₹)</th>
                  <th style={{ ...tableCellStyles, textAlign: 'center' }}>Paid Date</th>
                  <th style={{ ...tableCellStyles, textAlign: 'center' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '24px', textAlign: 'center' }}>Loading...</td>
                  </tr>
                ) : filteredPaidReceipts.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '24px', textAlign: 'center' }}>
                      No paid wages found
                    </td>
                  </tr>
                ) : (
                  filteredPaidReceipts.map((receipt, index) => (
                    <tr key={receipt.receipt_id} style={tableRowStyles}>
                      <td style={tableCellStyles}>{index + 1}</td>
                      <td
                        style={{ ...tableCellStyles, color: '#16a34a', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={() => handleViewReceipt(receipt.receipt_id)}
                      >
                        {receipt.operator_name}
                      </td>
                      <td style={{ ...tableCellStyles, textAlign: 'center' }}>
                        {receipt.total_pieces}
                      </td>
                      <td style={{ ...tableCellStyles, textAlign: 'right' }}>₹{parseNumber(receipt.gross_amount).toFixed(2)}</td>
                      <td style={{ ...tableCellStyles, textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>₹{parseNumber(receipt.paid_amount).toFixed(2)}</td>
                      <td style={{ ...tableCellStyles, textAlign: 'center' }}>{receipt.paid_date ? new Date(receipt.paid_date).toLocaleDateString("en-GB") : ''}</td>
                      <td style={{ ...tableCellStyles, textAlign: 'center' }}>
                        <button
                          onClick={() => handleViewReceipt(receipt.receipt_id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#0071bc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                          }}
                        >
                          View Receipt 🧾
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal with editable payable amount */}
      {showPaymentModal && selectedOperator && (
        <div style={modalContainerStyles}>
          <div style={modalContentStyles}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#0071bc' }}>
              Process Payment - {selectedOperator.operator_name}
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                    Gross Amount
                  </label>
                  <input type="text" value={`₹${parseNumber(grossAmount).toFixed(2)}`} readOnly style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', backgroundColor: '#f3f4f6' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                    Pending Advance
                  </label>
                  <input
                    type="text"
                    value={`₹${parseNumber(pendingAdvance) >= 0 ? parseNumber(pendingAdvance).toFixed(2) : Math.abs(parseNumber(pendingAdvance)).toFixed(2)}`}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      backgroundColor: '#f3f4f6',
                      color: parseNumber(pendingAdvance) >= 0 ? '#dc2626' : '#16a34a'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                    Advance Deduction / Given
                  </label>
                  <input
                    type="text"
                    value={`${parseNumber(deductAdvance) >= 0 ? '-' : '+'}₹${Math.abs(parseNumber(deductAdvance)).toFixed(2)}`}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      backgroundColor: '#f3f4f6',
                      color: parseNumber(deductAdvance) >= 0 ? '#dc2626' : '#16a34a',
                      fontWeight: 'bold'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                    Payable Amount (Editable)
                  </label>
                  <input
                    type="number"
                    value={parseNumber(payableAmount).toFixed(2)}
                    onChange={(e) => handlePayableAmountChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '2px solid #16a34a',
                      borderRadius: '6px',
                      backgroundColor: '#dcfce7',
                      fontWeight: 'bold',
                      color: parseNumber(payableAmount) >= 0 ? '#15803d' : '#dc2626',
                      // --- स्पिनर हटाने के लिए CSS ---
                      WebkitAppearance: 'none', // Chrome, Safari, Edge, Opera
                      MozAppearance: 'textfield', // Firefox
                      appearance: 'none',
                      // ----------------------------
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>
                  Payment Type
                </label>
                <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}>
                  <option value="Cash">Cash</option>
                  <option value="Online">Online</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: parseNumber(deductAdvance) < 0 ? '#dcfce7' : '#fee2e2',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}>
                <strong>Note:</strong> {parseNumber(deductAdvance) >= 0
                  ? `Deducting ₹${parseNumber(deductAdvance).toFixed(2)} from advance payments. This amount will reduce the operator's pending advance balance.`
                  : `Giving ₹${Math.abs(parseNumber(deductAdvance)).toFixed(2)} as a new advance (Negative Deduction/Advance Given). This amount will increase the operator's pending advance balance.`
                }
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPaymentModal(false)} style={{ padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={processPayment} disabled={loading} style={{ padding: '10px 20px', backgroundColor: loading ? '#9ca3af' : '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Processing...' : 'Process Payment & Generate Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries Modal - View Entries */}
      {showEntriesModal && selectedOperator && (
        <div style={modalContainerStyles}>
          <div style={modalContentStyles}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.5rem', color: '#0071bc', margin: 0 }}>
                Entries for {selectedOperator.operator_name}
              </h3>
              <button
                onClick={handlePrintEntries}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🖨️ Print
              </button>
            </div>
            {/* Summary Card for Entries Modal */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                padding: '12px',
                backgroundColor: '#f0f8ff',
                border: '1px solid #0071bc',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '1rem'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <strong>Gross Wages:</strong><br />
                    <span style={{ color: '#16a34a', fontWeight: 'bold' }}>₹{parseNumber(selectedOperator.gross_amount).toFixed(2)}</span>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid #ddd', paddingLeft: '15px' }}>
                    <strong>Adv. Pending:</strong><br />
                    <span style={{ color: parseNumber(selectedOperator.pending_advance) >= 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                        {parseNumber(selectedOperator.pending_advance) >= 0 ? '₹' + parseNumber(selectedOperator.pending_advance).toFixed(2) : '₹' + Math.abs(parseNumber(selectedOperator.pending_advance)).toFixed(2)}
                    </span>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid #ddd', paddingLeft: '15px' }}>
                    <strong>Net Payable:</strong><br />
                    <span style={{ color: '#0071bc', fontWeight: 'bold', fontSize: '1.1rem' }}>₹{parseNumber(selectedOperator.payable_amount).toFixed(2)}</span>
                </div>
            </div>
            {/* END: Summary Card */}

            <div style={{ border: "1px solid #e5e7eb", marginBottom: "24px", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#e5e7eb" }}>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>Product</th>
                    <th style={{ padding: "12px 8px", textAlign: "center" }}>Pieces</th>
                    <th style={{ padding: "12px 8px", textAlign: "center" }}>Weight (kg)</th>
                    <th style={{ padding: "12px 8px", textAlign: "center" }}>Average (kg/pc)</th>
                    <th style={{ padding: "12px 8px", textAlign: "center" }}>Rate (₹/pc)</th>
                    <th style={{ padding: "12px 8px", textAlign: "right" }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {operatorEntries.length > 0 ? (
                    operatorEntries.map((entry, index) => {
                      const pieces = parseNumber(entry.pieces);
                      // Using weight_of_fabric field, which is now fetched from backend
                      const weight = parseNumber(entry.weight || entry.total_weight || entry.weight_of_fabric);
                      const grossAmount = parseNumber(entry.gross_amount);
                      const ratePerPiece = pieces > 0 ? (grossAmount / pieces) : 0;
                      const avgPerPiece = pieces > 0 ? (weight / pieces) : 0;

                      return (
                        <tr key={entry.id} style={{
                          borderBottom: "1px solid #d1d5db",
                          backgroundColor: index % 2 === 0 ? 'transparent' : '#f9fafb'
                        }}>
                          <td style={{ padding: "10px 8px" }}>{formatDate(entry.date || entry.created_at)}</td>
                          <td style={{ padding: "10px 8px" }}>{renderSafeValue(entry.product_name)}</td>
                          <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: 'bold' }}>{renderSafeValue(pieces)}</td>
                          <td style={{ padding: "10px 8px", textAlign: "center", color: '#0071bc', fontWeight: 'bold' }}>
                            {weight.toFixed(2)}
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "center", color: '#059669', fontWeight: 'bold' }}>
                            {avgPerPiece.toFixed(3)}
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "center", color: '#0071bc', fontWeight: 'bold' }}>
                            ₹{ratePerPiece.toFixed(2)}
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 'bold' }}>₹{grossAmount.toFixed(2)}</td>
                        </tr>
                      );
                    })
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "20px", fontStyle: 'italic', color: '#666' }}>
                          No entries found.
                        </td>
                      </tr>
                    )}
                  {operatorEntries.length > 0 && (
                    <tr style={{
                      backgroundColor: '#e8f4f8',
                      borderTop: '2px solid #0071bc',
                      fontWeight: 'bold'
                    }}>
                      <td colSpan="2" style={{ padding: "12px 8px", fontWeight: 'bold' }}>
                        <strong>TOTALS:</strong>
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "center", fontWeight: 'bold', color: '#16a34a' }}>
                        {operatorEntries.reduce((sum, entry) => sum + (parseInt(entry.pieces) || 0), 0)}
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "center", fontWeight: 'bold', color: '#0071bc' }}>
                        {operatorEntries.reduce((sum, entry) => sum + (parseNumber(entry.weight || entry.total_weight || entry.weight_of_fabric) || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "center", fontWeight: 'bold', color: '#059669' }}>
                        {(operatorEntries.reduce((sum, entry) => sum + (parseNumber(entry.weight || entry.total_weight || entry.weight_of_fabric) || 0), 0) / operatorEntries.reduce((sum, entry) => sum + (parseInt(entry.pieces) || 0), 0) || 0).toFixed(3)}
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "center", color: '#666' }}>-</td>
                      <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 'bold', color: '#16a34a' }}>
                        ₹{operatorEntries.reduce((sum, entry) => sum + (parseFloat(entry.gross_amount) || 0), 0).toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEntriesModal(false)} style={{ padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paid Receipt Modal */}
      {showPaidReceiptModal && receiptToView && (
        <div style={modalContainerStyles}>
          <div style={modalContentStyles}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#0071bc' }}>
              Payment Receipt for {receiptToView.operator_name}
            </h3>
            <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px', backgroundColor: '#f9f9f9', overflow: 'auto' }}>
              <PaymentReceipt
                ref={receiptRef}
                receiptDetails={receiptToView}
                operatorEntries={operatorEntries}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowPaidReceiptModal(false)} style={{ padding: '10px 20px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Close
              </button>
              <button onClick={handleGeneratePDF} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {message && <MessageModal message={message} onClose={() => setMessage(null)} />}
    </div>
  );
};

export default ViewCutting;