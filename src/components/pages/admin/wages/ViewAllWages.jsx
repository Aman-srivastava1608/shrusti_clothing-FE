import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { Eye, FileText } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
// Placeholder for your logo import. Adjust the path as needed.
import shrustiLogo from "../../../../assets/shrusti-logo.png";

// =========================================================================
// WageSlip Component for PDF Generation
// This component is copied and adapted from your CuttingEntryList page
// It uses React.forwardRef to allow it to be rendered to a hidden div for PDF creation
// =========================================================================
const WageSlip = React.forwardRef(({ entry, sizeDetails }, ref) => {
  if (!entry) return null;

  return (
    <div
      ref={ref}
      style={{
        width: "210mm",
        height: "297mm",
        padding: "20mm",
        backgroundColor: "#ffffff",
        color: "#1f2937",
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={shrustiLogo} alt="Shrusti Clothing Logo" style={{ height: '70px', marginRight: '15px' }} />
          <div>
            <p style={{ fontSize: "2.25rem", fontWeight: "bold", margin: 0 }}>
              Shrusti
            </p>
            <p style={{ fontSize: "1.5rem", margin: 0 }}>
              clothing
            </p>
          </div>
        </div>
        <h2 style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#0071bc" }}>
          WAGES
        </h2>
      </div>

      <div style={{ marginBottom: "24px", fontSize: "1.125rem" }}>
        <p>
          <strong>Staff Name:</strong> {entry.staffName}
        </p>
        <p>
          <strong>Product Name:</strong> {entry.productName}
        </p>
        <p>
          <strong>Operation Name:</strong> {entry.operationName}
        </p>
        <p>
          <strong>Date:</strong> {entry.date}
        </p>
      </div>

      <div style={{ border: "1px solid black" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#0071bc", color: "#ffffff" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>
                Size Range(Y)
              </th>
              <th style={{ padding: "8px" }}>Price (Rs.)</th>
              <th style={{ padding: "8px" }}>Qty</th>
              <th style={{ padding: "8px" }}>Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {sizeDetails &&
              Object.entries(sizeDetails).map(([size, pcs]) => (
                <tr key={size} style={{ borderBottom: "1px solid #d1d5db" }}>
                  <td style={{ padding: "8px", textAlign: "left" }}>{size}</td>
                  <td style={{ padding: "8px" }}>
                    {parseFloat(entry.grossAmount / entry.totalPieces).toFixed(2) || 0}
                  </td>
                  <td style={{ padding: "8px" }}>{pcs}</td>
                  <td style={{ padding: "8px" }}>
                    {parseFloat(
                      (entry.grossAmount / entry.totalPieces) * pcs
                    ).toFixed(2) || 0}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <div style={{ width: "50%" }}>
          <p>
            <strong>Gross Amount(Rs.):</strong> {entry.grossAmount}
          </p>
          <p>
            <strong>Deduction (Adv. Pay.):</strong> {entry.deduction}
          </p>
          <p>
            <strong>Payable Amount (Rs.):</strong> {entry.payableAmount}
          </p>
          <h4 style={{ fontWeight: "bold", fontSize: "1.125rem", marginTop: "8px" }}>
            Total: {entry.payableAmount}
          </h4>
        </div>
      </div>

      <div style={{ marginTop: "48px", display: "flex", justifyContent: "space-between" }}>
        <div style={{ width: "50%" }}>
          <p style={{ fontWeight: "bold" }}>Operation Manager Sign.</p>
          <div style={{ borderBottom: "1px solid black", marginTop: "32px" }}></div>
        </div>
        <div style={{ width: "50%", textAlign: "right" }}>
          <p style={{ fontWeight: "bold" }}>Company Stamp</p>
          <div style={{ borderBottom: "1px solid black", marginTop: "32px" }}></div>
        </div>
      </div>
    </div>
  );
});

// =========================================================================
// Main ViewWages Component
// =========================================================================
const ViewWages = () => {
  const [operations, setOperations] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  const [wageData, setWageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({});
  const { branchId } = useParams();
  const [pendingBalances, setPendingBalances] = useState({});
  const [payableAmounts, setPayableAmounts] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    operator: "",
    grossAmount: 0,
    deduction: 0,
    payableAmount: 0,
    paymentType: "",
    jobs: [],
  });
  const [entryToPrint, setEntryToPrint] = useState(null);
  const [sizeDetailsToPrint, setSizeDetailsToPrint] = useState(null);
  const slipRef = useRef();

  // New state for the search query and selected date
  const [searchQuery, setSearchQuery] = useState("");
  // Set default date to today's date in 'YYYY-MM-DD' format
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // ================= Fetch ALL Operations for Dropdown =================
  useEffect(() => {
    const fetchOperations = async () => {
      const storedToken = localStorage.getItem("branchToken");
      if (!storedToken || !branchId) {
        setLoading(false);
        setError("Authentication token or Branch ID missing.");
        return;
      }
      const headers = { Authorization: `Bearer ${storedToken}` };
      const params = { branch_id: branchId };

      try {
        const res = await axios.get(
          `${apiBaseUrl}/api/operations`,
          { headers, params }
        );
        const fetchedOperations = res.data.filter(op => op.name.toLowerCase() !== 'cutting');
        setOperations(fetchedOperations);
        if (fetchedOperations.length > 0) {
          setActiveTab(fetchedOperations[0].name.toLowerCase());
        }
      } catch (err) {
        console.error("Error fetching operations:", err);
        setError("Failed to fetch operations.");
        setLoading(false);
      }
    };
    fetchOperations();
  }, [branchId]);

  // ================= Fetch ALL Wages for Active Operation =================
  useEffect(() => {
    const fetchWagesAndBalances = async () => {
      // Ensure activeTab and selectedDate are available before fetching
      if (!activeTab || !selectedDate) return;

      const storedToken = localStorage.getItem("branchToken");
      if (!storedToken || !branchId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setWageData([]);
      setPendingBalances({});
      setPayableAmounts({});

      const headers = { Authorization: `Bearer ${storedToken}` };

      try {
        const isCutting = activeTab === 'cutting';
        const isFlatlockOrOverlock = activeTab === 'flatlock' || activeTab === 'overlock';

        let staffDetails = [];
        if (isFlatlockOrOverlock) {
          const staffOpName = activeTab === 'flatlock' ? 'flatlock' : 'overlock';
          const staffRes = await axios.get(`${apiBaseUrl}/api/staff/by-operation/${staffOpName}`, {
            headers,
            params: { branch_id: branchId },
          });
          staffDetails = staffRes.data;
        }

        const url = isCutting
          ? `${apiBaseUrl}/api/cutting-entry/list`
          : `${apiBaseUrl}/api/wages/by-operation`;

        const wageParams = {
          branch_id: branchId,
          operation: isFlatlockOrOverlock ? 'singer' : activeTab,
          date: selectedDate, // Pass the selected date to the backend
        };

        const wageRes = await axios.get(url, { headers, params: wageParams });
        const fetchedWages = wageRes.data.data || wageRes.data;
        setWageData(fetchedWages);

        if (isFlatlockOrOverlock) {
          const staffNames = [...new Set(fetchedWages.map(wage => {
            const staffKey = activeTab === 'flatlock' ? 'flatlock_operator' : 'overlock_operator';
            return wage[staffKey];
          }).filter(Boolean))];

          const balances = {};
          const fetchPromises = staffNames.map(async (name) => {
            const staffId = staffDetails.find(staff => staff.full_name === name)?.id;
            if (staffId) {
              const balanceRes = await axios.get(
                `${apiBaseUrl}/api/advance-payment/pending-balance`,
                {
                  params: { staff_id: staffId },
                  headers,
                }
              );
              if (balanceRes.data.success) {
                balances[name] = balanceRes.data.pendingBalance;
              } else {
                balances[name] = 0;
              }
            } else {
              balances[name] = 0;
            }
          });
          await Promise.all(fetchPromises);
          setPendingBalances(balances);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch data for this operation.");
      } finally {
        setLoading(false);
      }
    };
    fetchWagesAndBalances();
  }, [activeTab, branchId, selectedDate]); // ADDED selectedDate to dependency array

  const handleSelectChange = (e) => {
    setActiveTab(e.target.value);
  };

  const handleViewDetails = (sizeWiseEntry, extraPcs) => {
    try {
      const data = sizeWiseEntry && typeof sizeWiseEntry === "string" ? JSON.parse(sizeWiseEntry) : {};
      
      const modalDataWithExtra = { ...data };
      if (extraPcs > 0) {
        modalDataWithExtra["Extra Pieces"] = extraPcs;
      }

      setModalData(modalDataWithExtra);
      setShowModal(true);
    } catch (error) {
      console.error("Error parsing size data:", error);
      setModalData({ message: "An error occurred while loading details." });
      setShowModal(true);
    }
  };

  const handleViewTotalDetails = (jobs) => {
    const combinedData = {};
    jobs.forEach(job => {
      if (job.size_wise_entry) {
        try {
          const sizeData = JSON.parse(job.size_wise_entry);
          Object.entries(sizeData).forEach(([size, pcs]) => {
            combinedData[size] = (combinedData[size] || 0) + parseInt(pcs, 10);
          });
        } catch (error) {
          console.error("Error parsing size data for total:", error);
        }
      }
    });

    if (Object.keys(combinedData).length === 0) {
      setModalData({ message: "No size-wise entries found for this total." });
    } else {
      setModalData(combinedData);
    }
    setShowModal(true);
  };

  const handleGenerateReceiptClick = (operator, jobs) => {
    const totalGrossAmount = jobs.reduce((sum, job) => sum + parseFloat(job[`${activeTab}_gross_amount`] || 0), 0);
    const enteredPayable = parseFloat(payableAmounts[operator] !== undefined ? payableAmounts[operator] : totalGrossAmount);
    const calculatedDeduction = totalGrossAmount - enteredPayable;

    setPaymentData({
      operator: operator,
      grossAmount: totalGrossAmount.toFixed(2),
      deduction: calculatedDeduction.toFixed(2),
      payableAmount: enteredPayable.toFixed(2),
      paymentType: "",
      jobs: jobs,
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    // Prepare data for the API call to mark as paid
    const jobsToUpdate = paymentData.jobs.map(job => {
      return {
        id: job.id,
        payable_amount: parseFloat(paymentData.payableAmount),
        deduct_advance_pay: parseFloat(paymentData.deduction),
        payment_type: paymentData.paymentType,
      };
    });

    const paymentDetails = {
      operator: paymentData.operator,
      total_payable: parseFloat(paymentData.payableAmount),
      deduction: parseFloat(paymentData.deduction),
      payment_type: paymentData.paymentType,
      jobs: jobsToUpdate,
      operation: activeTab,
    };

    try {
      const token = localStorage.getItem("branchToken");
      const res = await axios.post(`${apiBaseUrl}/api/wages/pay`, paymentDetails, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 200) {
        // Generate PDF after successful API call
        const combinedSizeDetails = {};
        paymentData.jobs.forEach(job => {
          if (job.size_wise_entry) {
            try {
              const sizeData = JSON.parse(job.size_wise_entry);
              Object.entries(sizeData).forEach(([size, pcs]) => {
                combinedSizeDetails[size] = (combinedSizeDetails[size] || 0) + parseInt(pcs, 10);
              });
            } catch (error) {
              console.error("Error combining size data for receipt:", error);
            }
          }
        });

        const entryData = {
          staffName: paymentData.operator,
          productName: paymentData.jobs[0]?.product_name || "N/A",
          operationName: activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
          date: selectedDate,
          grossAmount: paymentData.grossAmount,
          deduction: paymentData.deduction,
          payableAmount: paymentData.payableAmount,
          totalPieces: paymentData.jobs.reduce((sum, job) => sum + (job.total_pieces || 0), 0),
        };

        setEntryToPrint(entryData);
        setSizeDetailsToPrint(combinedSizeDetails);

        setTimeout(async () => {
          const canvas = await html2canvas(slipRef.current);
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
          pdf.save(`WageSlip-${entryData.staffName}-${entryData.operationName}-${selectedDate}.pdf`);
          
          // Reset states and re-fetch data
          setEntryToPrint(null);
          setSizeDetailsToPrint(null);
          setShowPaymentModal(false);
          // Re-fetch data to update the table
          // You may need to call the fetchWagesAndBalances function here again
          // depending on your application's architecture
        }, 500);
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
      alert("Payment failed. Please try again.");
    }
  };


  const handlePrintSingleReceipt = async (wage, operationType) => {
    const grossAmountKey = `${operationType}_gross_amount`;
    const payableAmountKey = `${operationType}_payable_amount`;
    const deductAdvanceKey = `${operationType}_deduct_advance_pay`;

    const entryData = {
      staffName: wage.staff_name || wage.cutting_master || wage.flatlock_operator || wage.overlock_operator,
      productName: wage.product_name || "N/A",
      operationName: operationType.charAt(0).toUpperCase() + operationType.slice(1),
      date: new Date(wage.date || wage.created_at).toLocaleDateString("en-GB"),
      grossAmount: parseFloat(wage.gross_amount || wage[grossAmountKey] || 0).toFixed(2),
      deduction: parseFloat(wage.deduct_advance_pay || wage[deductAdvanceKey] || 0).toFixed(2),
      payableAmount: parseFloat(wage.payable_amount || wage[payableAmountKey] || 0).toFixed(2),
      totalPieces: wage.total_pieces,
    };

    let sizeDetails = {};
    if (wage.size_wise_entry) {
      try {
        sizeDetails = JSON.parse(wage.size_wise_entry);
      } catch (error) {
        console.error("Error parsing size data for single receipt:", error);
      }
    }

    setEntryToPrint(entryData);
    setSizeDetailsToPrint(sizeDetails);

    setTimeout(async () => {
      const canvas = await html2canvas(slipRef.current);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`WageSlip-${entryData.staffName}-${entryData.operationName}-${entryData.date}.pdf`);

      setEntryToPrint(null);
      setSizeDetailsToPrint(null);
    }, 500);
  };

  const handlePrintTotalReceipt = async (operator, jobs) => {
    const grossAmountKey = activeTab === 'flatlock' ? 'flatlock_gross_amount' : 'overlock_gross_amount';
    const payableAmountKey = activeTab === 'flatlock' ? 'flatlock_payable_amount' : 'overlock_payable_amount';

    const totalGrossAmount = jobs.reduce((sum, job) => sum + parseFloat(job[grossAmountKey] || 0), 0);
    const enteredPayable = parseFloat(payableAmounts[operator] !== undefined ? payableAmounts[operator] : totalGrossAmount);
    const calculatedDeduction = totalGrossAmount - enteredPayable;

    const combinedSizeDetails = {};
    jobs.forEach(job => {
      if (job.size_wise_entry) {
        try {
          const sizeData = JSON.parse(job.size_wise_entry);
          Object.entries(sizeData).forEach(([size, pcs]) => {
            combinedSizeDetails[size] = (combinedSizeDetails[size] || 0) + parseInt(pcs, 10);
          });
        } catch (error) {
          console.error("Error combining size data for receipt:", error);
        }
      }
    });

    const entryData = {
      staffName: operator,
      productName: jobs[0]?.product_name || "N/A",
      operationName: activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
      date: selectedDate, // Use the selected date
      grossAmount: totalGrossAmount.toFixed(2),
      deduction: calculatedDeduction.toFixed(2),
      payableAmount: enteredPayable.toFixed(2),
      totalPieces: jobs.reduce((sum, job) => sum + (job.total_pieces || 0), 0),
    };

    setEntryToPrint(entryData);
    setSizeDetailsToPrint(combinedSizeDetails);

    setTimeout(async () => {
      const canvas = await html2canvas(slipRef.current);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`WageSlip-${entryData.staffName}-${entryData.operationName}-${selectedDate}.pdf`);

      setEntryToPrint(null);
      setSizeDetailsToPrint(null);
    }, 500);
  };


  const isSingerTab = activeTab === "singer";
  const isFlatlockTab = activeTab === "flatlock";
  const isOverlockTab = activeTab === "overlock";
  const isCuttingTab = activeTab === "cutting";

  const renderTableContent = () => {
    if (loading) {
      return <p className="text-center text-gray-500">Loading wages...</p>;
    }
    if (error) {
      return <p className="text-center text-red-500">Error: {error}</p>;
    }

    // Filtering logic based on the search query
    const filteredWages = wageData.filter((wage) => {
      const searchTerm = searchQuery.toLowerCase();
      let staffName = "";
      if (isCuttingTab) {
        staffName = wage.cutting_master || "";
      } else if (isSingerTab) {
        staffName = wage.staff_name || "";
      } else if (isFlatlockTab) {
        staffName = wage.flatlock_operator || "";
      } else if (isOverlockTab) {
        staffName = wage.overlock_operator || "";
      } else {
        staffName = wage.staff_name || "";
      }
      return staffName.toLowerCase().includes(searchTerm);
    });

    if (filteredWages.length === 0) {
      return <p className="text-center text-gray-500">No wage entries found for this operation and date.</p>;
    }

    if (isCuttingTab) {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">S. No.</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Product</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Cutting Master</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Total Pieces</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Gross Amount (₹)</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Payable Amount (₹)</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWages.map((wage, index) => (
                <tr key={wage.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{index + 1}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{new Date(wage.created_at).toLocaleDateString()}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.product_name}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.cutting_master}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700 flex items-center justify-center gap-2">
                    {wage.total_pcs}
                    {(wage.size_wise_entry || wage.extra_pcs > 0) && (
                      <button onClick={() => handleViewDetails(wage.size_wise_entry, wage.extra_pcs)} className="text-gray-500 hover:text-blue-600 transition-colors">
                        <Eye size={18} />
                      </button>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.gross_amount}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.payable_amount}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    <button
                      onClick={() => handlePrintSingleReceipt(wage, 'cutting')}
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                      title="Print Receipt"
                    >
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (isSingerTab) {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">S. No.</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Product</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Singer Name</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Flatlock Name</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Overlock Name</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Total Pieces</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Gross Amount (₹)</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Deduct Advance (₹)</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Payable Amount (₹)</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWages.map((wage, index) => (
                <tr key={wage.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{index + 1}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{new Date(wage.date).toLocaleDateString()}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.product_name}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.staff_name}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.flatlock_operator}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.overlock_operator}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700 flex items-center justify-center gap-2">
                    {wage.total_pieces}
                    {wage.size_wise_entry && (
                      <button onClick={() => handleViewDetails(wage.size_wise_entry)} className="text-gray-500 hover:text-blue-600 transition-colors">
                        <Eye size={18} />
                      </button>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.gross_amount}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.deduct_advance_pay}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.payable_amount}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    <button
                      onClick={() => handlePrintSingleReceipt(wage, 'singer')}
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                      title="Print Receipt"
                    >
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (isFlatlockTab) {
      const groupedFlatlockData = filteredWages.reduce((acc, wage) => {
        const operator = wage.flatlock_operator;
        const date = new Date(wage.date).toLocaleDateString('en-GB'); // Group by date
        if (operator) {
          if (!acc[operator]) {
            acc[operator] = {};
          }
          if (!acc[operator][date]) {
            acc[operator][date] = [];
          }
          acc[operator][date].push(wage);
        }
        return acc;
      }, {});
    
      if (Object.keys(groupedFlatlockData).length === 0) {
        return <p className="text-center text-gray-500">No Flatlock entries found for this date.</p>;
      }
    
      let sNo = 0;
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">S. No.</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Flatlock Staff</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Singer Name</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Total Pieces</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Gross Amount (₹)</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Payable Amount (₹)</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedFlatlockData).map(([operator, dateGroups]) => (
                <React.Fragment key={operator}>
                  {Object.entries(dateGroups).map(([date, jobs]) => {
                    const totalPieces = jobs.reduce((sum, job) => sum + job.total_pieces, 0);
                    const totalGrossAmount = jobs.reduce((sum, job) => sum + parseFloat(job.flatlock_gross_amount || 0), 0);
                    const hasSizeEntries = jobs.some(job => job.size_wise_entry);
                    const currentPayable = payableAmounts[operator] !== undefined ? payableAmounts[operator] : totalGrossAmount.toFixed(2);
    
                    return (
                      <React.Fragment key={`${operator}-${date}`}>
                        {jobs.map((wage) => (
                          <tr key={wage.id} className="hover:bg-gray-50">
                            <td className="py-2 px-4 border-b text-sm text-gray-700">{++sNo}</td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700">{new Date(wage.date).toLocaleDateString()}</td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.flatlock_operator}</td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.staff_name}</td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700 flex items-center justify-center gap-2">
                              {wage.total_pieces}
                              {wage.size_wise_entry && (
                                <button onClick={() => handleViewDetails(wage.size_wise_entry)} className="text-gray-500 hover:text-blue-600 transition-colors">
                                  <Eye size={18} />
                                </button>
                              )}
                            </td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.flatlock_gross_amount}</td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.flatlock_payable_amount}</td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700">
                              <button
                                onClick={() => handlePrintSingleReceipt(wage, 'flatlock')}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                title="Print Receipt"
                              >
                                <FileText size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-200 font-bold">
                          <td className="py-2 px-4 border-b text-sm text-gray-800" colSpan="4">
                            Total for {operator} on {date}
                            <span className="ml-2 font-normal text-red-600 text-xs">
                              (Pending Advance: ₹{pendingBalances[operator] || 0})
                            </span>
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800 flex items-center justify-center gap-2">
                            {totalPieces}
                            {hasSizeEntries && (
                              <button onClick={() => handleViewTotalDetails(jobs)} className="text-gray-500 hover:text-blue-600 transition-colors">
                                <Eye size={18} />
                              </button>
                            )}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">{totalGrossAmount.toFixed(2)}</td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={currentPayable}
                                onChange={(e) => setPayableAmounts({ ...payableAmounts, [operator]: e.target.value })}
                                className="w-24 p-1 border border-gray-300 rounded-lg text-sm font-normal"
                              />
                              <button
                                onClick={() => handleGenerateReceiptClick(operator, jobs)}
                                className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 text-sm"
                              >
                                Generate Receipt
                              </button>
                              <button
                                onClick={() => handlePrintTotalReceipt(operator, jobs)}
                                className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 text-sm"
                              >
                                Print Receipt
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (isOverlockTab) {
      const groupedOverlockData = filteredWages.reduce((acc, wage) => {
        const operator = wage.overlock_operator;
        const date = new Date(wage.date).toLocaleDateString('en-GB'); // Group by date
        if (operator) {
          if (!acc[operator]) {
            acc[operator] = {};
          }
          if (!acc[operator][date]) {
            acc[operator][date] = [];
          }
          acc[operator][date].push(wage);
        }
        return acc;
      }, {});
    
      if (Object.keys(groupedOverlockData).length === 0) {
        return <p className="text-center text-gray-500">No Overlock entries found for this date.</p>;
      }
    
      let sNo = 0;
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">S. No.</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Overlock Staff</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Singer Name</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Total Pieces</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Gross Amount (₹)</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Payable Amount (₹)</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedOverlockData).map(([operator, dateGroups]) => (
                <React.Fragment key={operator}>
                  {Object.entries(dateGroups).map(([date, jobs]) => {
                    const totalPieces = jobs.reduce((sum, job) => sum + job.total_pieces, 0);
                    const totalGrossAmount = jobs.reduce((sum, job) => sum + parseFloat(job.overlock_gross_amount || 0), 0);
                    const hasSizeEntries = jobs.some(job => job.size_wise_entry);
                    const currentPayable = payableAmounts[operator] !== undefined ? payableAmounts[operator] : totalGrossAmount.toFixed(2);
    
                    return (
                      <React.Fragment key={`${operator}-${date}`}>
                        {jobs.map((wage) => (
                          <tr key={wage.id} className="hover:bg-gray-50">
                            <td className="py-2 px-4 border-b text-sm text-gray-700">{++sNo}</td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700">{new Date(wage.date).toLocaleDateString()}</td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.overlock_operator}</td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.staff_name}</td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700 flex items-center justify-center gap-2">
                              {wage.total_pieces}
                              {wage.size_wise_entry && (
                                <button onClick={() => handleViewDetails(wage.size_wise_entry)} className="text-gray-500 hover:text-blue-600 transition-colors">
                                  <Eye size={18} />
                                </button>
                              )}
                            </td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.overlock_gross_amount}</td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.overlock_payable_amount}</td>
                            <td className="py-2 px-4 border-b text-sm text-gray-700">
                              <button
                                onClick={() => handlePrintSingleReceipt(wage, 'overlock')}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                title="Print Receipt"
                              >
                                <FileText size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-200 font-bold">
                          <td className="py-2 px-4 border-b text-sm text-gray-800" colSpan="4">
                            Total for {operator} on {date}
                            <span className="ml-2 font-normal text-red-600 text-xs">
                              (Pending Advance: ₹{pendingBalances[operator] || 0})
                            </span>
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800 flex items-center justify-center gap-2">
                            {totalPieces}
                            {hasSizeEntries && (
                              <button onClick={() => handleViewTotalDetails(jobs)} className="text-gray-500 hover:text-blue-600 transition-colors">
                                <Eye size={18} />
                              </button>
                            )}
                          </td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">{totalGrossAmount.toFixed(2)}</td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={currentPayable}
                                onChange={(e) => setPayableAmounts({ ...payableAmounts, [operator]: e.target.value })}
                                className="w-24 p-1 border border-gray-300 rounded-lg text-sm font-normal"
                              />
                              <button
                                onClick={() => handleGenerateReceiptClick(operator, jobs)}
                                className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 text-sm"
                              >
                                Generate Receipt
                              </button>
                              <button
                                onClick={() => handlePrintTotalReceipt(operator, jobs)}
                                className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 text-sm"
                              >
                                Print Receipt
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else {
      // Default view for all other operations
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">S. No.</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Product</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Staff Name</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Total Pieces</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Gross Amount (₹)</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Payable Amount (₹)</th>
                <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWages.map((wage, index) => (
                <tr key={wage.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{index + 1}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{new Date(wage.date).toLocaleDateString()}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.product_name}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.staff_name}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700 flex items-center justify-center gap-2">
                    {wage.total_pieces}
                    {wage.size_wise_entry && (
                      <button onClick={() => handleViewDetails(wage.size_wise_entry)} className="text-gray-500 hover:text-blue-600 transition-colors">
                        <Eye size={18} />
                      </button>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.gross_amount}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">{wage.payable_amount}</td>
                  <td className="py-2 px-4 border-b text-sm text-gray-700">
                    <button
                      onClick={() => handlePrintSingleReceipt(wage, activeTab)}
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                      title="Print Receipt"
                    >
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-6 text-[#0071bc]">
            View Wages by Operator
          </h2>

          {/* Dropdown, Date Filter, and Search Input */}
          {operations.length > 0 ? (
            <div className="flex flex-col md:flex-row justify-center items-center mb-6 gap-4">
              <label htmlFor="operation-select" className="sr-only">Choose an operation</label>
              <select
                id="operation-select"
                value={activeTab}
                onChange={handleSelectChange}
                className="py-2 px-4 font-semibold text-lg border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {operations.map((op) => (
                  <option key={op.id} value={op.name.toLowerCase()}>
                    {op.name}
                  </option>
                ))}
              </select>

              {/* Date Input Field */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full md:w-auto py-2 px-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* Existing Search Input */}
              <input
                type="text"
                placeholder="Search by staff name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-auto max-w-lg py-2 px-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ) : (
            !loading && <p className="text-center text-gray-500">No operations found.</p>
          )}

          <hr className="my-6" />

          {/* Conditional table rendering based on the active tab */}
          {renderTableContent()}
        </div>
      </div>

      {/* Modal component */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4 text-center">Size-wise Pieces</h3>
            {modalData.message ? (
              <p className="text-center text-gray-500">{modalData.message}</p>
            ) : (
              <ul className="list-disc pl-5 space-y-2">
                {Object.entries(modalData).map(([size, pieces]) => (
                  <li key={size}>
                    <strong className="text-gray-700">{size}:</strong> <span className="text-gray-600">{pieces} pcs</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4 text-center">Confirm Payment</h3>
            <p className="mb-2">
              Pay ₹<span className="font-bold">{paymentData.payableAmount}</span> to <span className="font-semibold">{paymentData.operator}</span>?
            </p>
            <p className="text-sm mb-4 text-gray-600">
              (Gross: ₹{paymentData.grossAmount}, Deduction: ₹{paymentData.deduction})
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Mode
            </label>
            <select
              value={paymentData.paymentType}
              onChange={(e) => setPaymentData({ ...paymentData, paymentType: e.target.value })}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-xl shadow-sm"
              required
            >
              <option value="">-- Select Payment Mode --</option>
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Cheque">Cheque</option>
            </select>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentSubmit}
                disabled={!paymentData.paymentType || parseFloat(paymentData.payableAmount) <= 0}
                className={`px-4 py-2 rounded-lg text-white font-bold transition-colors
                  ${!paymentData.paymentType || parseFloat(paymentData.payableAmount) <= 0 ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                Confirm & Generate Receipt
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden WageSlip component for PDF generation */}
      {entryToPrint && (
        <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
          <WageSlip ref={slipRef} entry={entryToPrint} sizeDetails={sizeDetailsToPrint} />
        </div>
      )}
    </div>
  );
};

export default ViewWages;