import React, { useState, useRef, useMemo } from "react";
import useWagesData from "./viewWages/hooks/useWagesData.js";
import { SizeDetailsModal, PaymentConfirmationModal } from "./viewWages/components/WagesModals.jsx";
import { 
  handlePaymentSubmit, 
  handlePrintReceipt, 
  filterJobsByPaymentStatus, 
  validatePaymentData,
  // hasUnpaidJobs // Not used in the final return, but kept for completeness if needed
} from "./viewWages/utils/WagesUtils.js";
import WageSlip from "./viewWages/WageSlip.jsx";
import OperatorList from "./viewWages/components/OperatorList.jsx";
import OperatorDetails from "./viewWages/components/OperatorDetails.jsx";
import axios from "axios";

// Base URL for API calls
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const ViewAllWages = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("unpaid");
  
  // Custom hook to fetch and manage wage data
  const { 
    operations, 
    activeTab, 
    setActiveTab, 
    wageData, 
    loading, 
    error, 
    pendingBalances,
    refreshWagesData,
    refreshAdvanceBalances
  } = useWagesData();

  // Modal and state management for payment/details
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [modalData, setModalData] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    operator: "",
    grossAmount: 0,
    deduction: 0,
    payableAmount: 0,
    paymentType: "",
    jobs: [],
    advanceDeduction: 0,
    advance_payment_id: null,
    staffId: null,
  });

  // State for printing
  const [entryToPrint, setEntryToPrint] = useState(null);
  const [sizeDetailsToPrint, setSizeDetailsToPrint] = useState(null);
  const slipRef = useRef(); // Ref for the component to be printed

  // State for drilling down into operator details
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [operatorJobs, setOperatorJobs] = useState([]);

  /**
   * Fetches the pending advance payment ID for a given staff member.
   * @param {number} staffId - The ID of the staff member.
   * @returns {Promise<number|null>} The ID of the pending advance payment or null.
   */
  const getAdvancePaymentId = async (staffId) => {
    if (!staffId) return null;

    try {
      const token = localStorage.getItem("branchToken");
      const response = await axios.get(`${apiBaseUrl}/api/advance-payments`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { staff_id: staffId }
      });

      if (response.data.success && response.data.advance_payments) {
        const pendingAdvance = response.data.advance_payments.find(ap => 
          parseFloat(ap.amount) > 0 && !ap.is_paid // Find an advance with remaining balance
        );
        return pendingAdvance?.id || null;
      }
      return null;
    } catch (error) {
      console.error("Error fetching advance payment ID:", error);
      return null;
    }
  };

  /**
   * Memoized function to group wage data by operator and payment status (paid/unpaid).
   */
  const { unpaidGroupedData, paidGroupedData } = useMemo(() => {
    if (!wageData || wageData.length === 0) return { unpaidGroupedData: {}, paidGroupedData: {} };

    // Determine the key to use for grouping based on the active operation tab
    const operatorKey =
      activeTab === "flatlock"
        ? "flatlock_operator"
        : activeTab === "overlock"
        ? "overlock_operator"
        : "staff_name";

    // 1. Filter by search query
    const filteredWages = wageData.filter((wage) => {
      const searchTerm = searchQuery.toLowerCase();
      const operator = wage[operatorKey];
      if (!operator) return false;
      return operator.toLowerCase().includes(searchTerm);
    });

    // 2. Separate into Unpaid and Paid lists
    const unpaidWages = filteredWages.filter((wage) => {
      switch(activeTab) {
        case 'singer':
          return !wage.singer_paid;
        case 'flatlock':
          return !wage.flatlock_paid;
        case 'overlock':
          return !wage.overlock_paid;
        default:
          return !wage.is_paid;
      }
    });

    const paidWages = filteredWages.filter((wage) => {
      switch(activeTab) {
        case 'singer':
          return wage.singer_paid;
        case 'flatlock':
          return wage.flatlock_paid;
        case 'overlock':
          return wage.overlock_paid;
        default:
          return wage.is_paid;
      }
    });

    // 3. Group Unpaid Wages by Operator Name
    const unpaidGroupedData = unpaidWages.reduce((acc, wage) => {
      const operator = wage[operatorKey];
      if (operator) {
        if (!acc[operator]) acc[operator] = [];
        acc[operator].push(wage);
      }
      return acc;
    }, {});

    // 4. Group Paid Wages by Operator Name and Payment ID (to group one receipt's jobs)
    const paidGroupedData = {};
    const operatorPaymentCount = {};

    paidWages.forEach((wage) => {
      const operator = wage[operatorKey];
      if (operator) {
        // Find the unique payment ID for the current wage entry
        const paymentIdKey = activeTab === 'singer' ? 'singer_payment_id' 
                            : activeTab === 'flatlock' ? 'flatlock_payment_id' 
                            : activeTab === 'overlock' ? 'overlock_payment_id' 
                            : 'payment_id';
        
        const currentPaymentId = wage[paymentIdKey];

        let shouldCreateNewEntry = true;
        let targetKey = operator;

        // Check if this wage belongs to an already existing payment group
        for (let key of Object.keys(paidGroupedData)) {
          // Only check keys that start with the current operator's name
          if (key.startsWith(operator)) {
            const existingWages = paidGroupedData[key];
            const firstWageInGroup = existingWages[0];
            
            // Check if the payment IDs match
            if (firstWageInGroup[paymentIdKey] === currentPaymentId && currentPaymentId) {
              paidGroupedData[key].push(wage);
              shouldCreateNewEntry = false;
              break;
            }
          }
        }

        // If no matching payment group was found, create a new entry
        if (shouldCreateNewEntry) {
          operatorPaymentCount[operator] = (operatorPaymentCount[operator] || 0) + 1;
          
          // Create a unique key for the payment group if there are multiple payments
          if (operatorPaymentCount[operator] > 1) {
            targetKey = `${operator} (Payment #${operatorPaymentCount[operator]})`;
          } else {
            targetKey = operator;
          }

          paidGroupedData[targetKey] = [wage];
        }
      }
    });

    return { unpaidGroupedData, paidGroupedData };
  }, [wageData, activeTab, searchQuery]);

  /**
   * Handles click on an operator's name to view their individual jobs.
   * @param {string} operator - The name of the operator.
   * @param {Array} jobs - List of jobs for that operator.
   */
  const handleOperatorClick = (operator, jobs) => {
    setSelectedOperator(operator);
    // Sort jobs by date (newest first)
    const sorted = [...jobs].sort(
      (a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at)
    );
    setOperatorJobs(sorted);
  };

  /**
   * Displays the size-wise details of a job in a modal.
   * @param {string|object} sizeWiseEntry - The JSON string or object containing size details.
   * @param {number} [extraPcs=0] - Any extra pieces to include in the count.
   */
  const handleViewDetails = (sizeWiseEntry, extraPcs) => {
    try {
      let parsed = {};
      if (typeof sizeWiseEntry === "string") {
        parsed = JSON.parse(sizeWiseEntry || "{}");
      } else if (typeof sizeWiseEntry === "object" && sizeWiseEntry !== null) {
        parsed = { ...sizeWiseEntry };
      }

      const extra = extraPcs ?? 0;
      const extraNum = typeof extra === "number" ? extra : parseFloat(extra) || 0;
      
      // Add 'Extra Pieces' to the display data if they exist
      if (extraNum > 0) {
        parsed["Extra Pieces"] = (parsed["Extra Pieces"] || 0) + extraNum;
      }

      setModalData(parsed && Object.keys(parsed).length ? parsed : { Message: "No size-wise data." });
      setShowSizeModal(true);
    } catch (error) {
      console.error("Error parsing size data:", error);
      setModalData({ Message: "An error occurred while loading details." });
      setShowSizeModal(true);
    }
  };

  /**
   * Clears selected operator state to return to the main list view.
   */
  const handleBackButtonClick = () => {
    setSelectedOperator(null);
    setOperatorJobs([]);
  };

  /**
   * Prepares the payment data and opens the confirmation modal.
   * This is triggered by the "Pay" button on the main list.
   * @param {string} operator - The name of the operator.
   * @param {Array} jobs - The list of all jobs for the operator (paid and unpaid).
   * @param {number} [customAdvanceDeduction=0] - The amount to deduct as advance/bonus (can be negative for bonus).
   */
  const handleGenerateReceiptClick = async (operator, jobs, customAdvanceDeduction = 0) => {
    console.log(`🔥 GENERATE RECEIPT with custom advance: ${customAdvanceDeduction}`);
    
    // Get the base operator name, stripping the '(Payment #X)' suffix for paid groups
    const baseOperator = operator.includes(' (Payment #') ? 
      operator.split(' (Payment #')[0] : operator;

    // Filter to get only UNPAID jobs for payment
    const unpaidJobs = filterJobsByPaymentStatus(jobs, activeTab, false);
    
    let filteredJobs = [];
    let grossAmountKey = "gross_amount";

    // Further filter based on the current operation type and operator name
    if (activeTab === "flatlock") {
      filteredJobs = unpaidJobs.filter((job) => job.flatlock_operator === baseOperator);
      grossAmountKey = "flatlock_gross_amount";
    } else if (activeTab === "overlock") {
      filteredJobs = unpaidJobs.filter((job) => job.overlock_operator === baseOperator);
      grossAmountKey = "overlock_gross_amount";
    } else {
      filteredJobs = unpaidJobs.filter((job) => job.staff_name === baseOperator);
      grossAmountKey = "gross_amount";
    }

    if (filteredJobs.length === 0) {
      alert(`No unpaid ${activeTab.toUpperCase()} jobs found for ${baseOperator}`);
      return;
    }

    try {
      const token = localStorage.getItem("branchToken");
      const branchId = localStorage.getItem("branchId") || localStorage.getItem("branch_id") || "1";
      
      // Get staff ID for advance deduction
      const staffRes = await axios.get(`${apiBaseUrl}/api/staff/by-operation/${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { branch_id: branchId },
      });
      
      const staffMember = staffRes.data.find((staff) => staff.full_name === baseOperator);
      if (!staffMember) {
        alert("Staff member not found");
        return;
      }

      // Get advance payment ID only if a deduction is intended (> 0)
      let advancePaymentId = null;
      if (customAdvanceDeduction > 0) {
        advancePaymentId = await getAdvancePaymentId(staffMember.id);
      }

      const totalGrossAmount = filteredJobs.reduce((sum, job) => sum + parseFloat(job[grossAmountKey] || 0), 0);
      
      // Use the custom advance deduction passed from the UI
      const finalAdvanceDeduction = parseFloat(customAdvanceDeduction) || 0;
      const payableAfterAdvance = totalGrossAmount - finalAdvanceDeduction;

      const newPaymentData = {
        operator: baseOperator,
        staffId: staffMember.id,
        grossAmount: totalGrossAmount.toFixed(2),
        // The properties requested by the user are included here:
        deduction: finalAdvanceDeduction.toFixed(2),
        payableAmount: payableAfterAdvance.toFixed(2),
        paymentType: "",
        jobs: filteredJobs,
        advanceDeduction: finalAdvanceDeduction,
        advance_payment_id: advancePaymentId,
        operationType: activeTab,
      };

      const validation = validatePaymentData(newPaymentData, activeTab);
      if (!validation.isValid) {
        alert(`Payment validation failed:\n${validation.errors.join('\n')}`);
        return;
      }

      setPaymentData(newPaymentData);
      setShowPaymentModal(true);

    } catch (error) {
      console.error("Error preparing payment:", error);
      alert("Error preparing payment. Please try again.");
    }
  };

  /**
   * Handles reprinting a receipt for a previously paid entry.
   * @param {string} operator - The full operator name/group key.
   * @param {Array} jobs - The jobs associated with that payment entry.
   */
  const handleReprintReceipt = async (operator, jobs) => {
    try {
      const baseOperator = operator.includes(' (Payment #') ? 
        operator.split(' (Payment #')[0] : operator;

      const grossAmountKey = activeTab === "flatlock" 
        ? "flatlock_gross_amount" 
        : activeTab === "overlock" 
        ? "overlock_gross_amount" 
        : "gross_amount";

      const totalGrossAmount = jobs.reduce(
        (sum, job) => sum + parseFloat(job[grossAmountKey] || 0), 0
      );

      // Advance deduction and payment type are stored on the jobs after payment
      const advanceDeducted = jobs[0]?.advance_deducted || 0;
      const payableAmount = totalGrossAmount - advanceDeducted;

      let paymentId = null;
      let paymentType = "Cash";
      
      if (jobs.length > 0) {
        const firstJob = jobs[0];
        switch (activeTab) {
          case "singer":
            paymentId = firstJob.singer_payment_id;
            paymentType = firstJob.payment_type || "Cash";
            break;
          case "flatlock":
            paymentId = firstJob.flatlock_payment_id;
            paymentType = firstJob.payment_type || "Cash";
            break;
          case "overlock":
            paymentId = firstJob.overlock_payment_id;
            paymentType = firstJob.payment_type || "Cash";
            break;
          default:
            paymentId = firstJob.payment_id;
            paymentType = firstJob.payment_type || "Cash";
        }
      }

      const entryData = {
        staffName: baseOperator,
        productName: jobs[0]?.product_name || "N/A",
        operationName: activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
        date: new Date().toLocaleDateString("en-GB"),
        grossAmount: totalGrossAmount.toFixed(2),
        deduction: advanceDeducted.toFixed(2),
        payableAmount: payableAmount.toFixed(2),
        totalPieces: jobs.reduce((sum, job) => sum + (job.total_pieces || job.total_pcs || 0), 0),
        advanceDeducted: advanceDeducted > 0,
        bonusAdded: advanceDeducted < 0,
        operationType: activeTab,
        paymentId: paymentId,
        paymentType: paymentType,
        isReprint: true,
        showSingerInfo: activeTab === 'flatlock' || activeTab === 'overlock'
      };

      setEntryToPrint(entryData);
      setSizeDetailsToPrint(jobs);

      // Wait briefly for the component to render before printing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const printResult = await handlePrintReceipt(entryData, jobs, slipRef);
      
      if (printResult.success) {
        setEntryToPrint(null);
        setSizeDetailsToPrint(null);
        alert(`Receipt reprinted successfully for ${baseOperator}!`);
      } else {
        alert(printResult.message || "Print failed. Please try again.");
      }

    } catch (error) {
      console.error("Reprint failed:", error);
      alert("Failed to reprint receipt. Please try again.");
    }
  };

  /**
   * Final function to submit the payment and print the receipt.
   * Called after confirmation in the PaymentConfirmationModal.
   */
  const handlePaymentAndPrint = async () => {
    try {
      // Re-validate just before submitting
      const validation = validatePaymentData(paymentData, activeTab);
      if (!validation.isValid) {
        alert(`Payment validation failed:\n${validation.errors.join('\n')}`);
        return;
      }

      // 1. Submit Payment to the backend
      const result = await handlePaymentSubmit(paymentData, activeTab);
      if (!result.success) {
        alert(result.message);
        return;
      }

      // 2. Prepare data for receipt printing
      const grossAmountKey =
        activeTab === "flatlock"
          ? "flatlock_gross_amount"
          : activeTab === "overlock"
          ? "overlock_gross_amount"
          : "gross_amount";

      const totalGrossAmount = paymentData.jobs.reduce(
        (sum, job) => sum + parseFloat(job[grossAmountKey] || 0), 0
      );
      
      const finalDeduction = result.advanceDeducted || paymentData.advanceDeduction || 0;

      const entryData = {
        staffName: paymentData.operator,
        productName: paymentData.jobs[0]?.product_name || "N/A",
        operationName: activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
        date: new Date().toLocaleDateString("en-GB"),
        grossAmount: totalGrossAmount.toFixed(2),
        deduction: finalDeduction.toFixed(2),
        payableAmount: paymentData.payableAmount,
        totalPieces: paymentData.jobs.reduce((sum, job) => sum + (job.total_pieces || job.total_pcs || 0), 0),
        advanceDeducted: finalDeduction > 0,
        bonusAdded: finalDeduction < 0,
        operationType: activeTab,
        paymentId: result.paymentId,
        paymentType: paymentData.paymentType || "Cash",
        showSingerInfo: activeTab === 'flatlock' || activeTab === 'overlock'
      };

      setEntryToPrint(entryData);
      setSizeDetailsToPrint(paymentData.jobs);

      // Wait briefly for the component to render before printing
      await new Promise(resolve => setTimeout(resolve, 100)); 
      
      // 3. Print Receipt
      const printResult = await handlePrintReceipt(entryData, paymentData.jobs, slipRef);
      if (printResult.success) {
        // Cleanup state after successful print
        setEntryToPrint(null);
        setSizeDetailsToPrint(null);
        setShowPaymentModal(false);
        
        let successMsg = `🎉 ${activeTab.toUpperCase()} payment successful!`;
        
        if (finalDeduction > 0) {
          successMsg += `\n💰 Advance payment of ₹${finalDeduction.toFixed(2)} deducted successfully.`;
        } else if (finalDeduction < 0) {
          successMsg += `\n🎁 Bonus of ₹${Math.abs(finalDeduction).toFixed(2)} added successfully.`;
        }
        
        alert(successMsg);
        
        // 4. Refresh data lists
        await refreshWagesData();
        await refreshAdvanceBalances(); // Refresh the advance balance list
        
        setSelectedOperator(null);
        setOperatorJobs([]);
        
      } else {
        alert(printResult.message);
      }
    } catch (error) {
      console.error("Payment process failed:", error);
      alert("Payment failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-6 text-[#0071bc]">View Wages by Operator</h2>
          
          {operations.length > 0 ? (
            <div className="flex flex-col md:flex-row justify-center items-center mb-6 gap-4">
              {/* Operation/Tab Selector */}
              <select
                id="operation-select"
                value={activeTab}
                onChange={(e) => {
                  setActiveTab(e.target.value);
                  setSelectedOperator(null);
                  setOperatorJobs([]);
                }}
                className="py-2 px-4 font-semibold text-lg border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {operations.map((op) => (
                  <option key={op.id} value={op.name.toLowerCase()}>
                    {op.name}
                  </option>
                ))}
              </select>

              {/* Search Input */}
              <input
                type="text"
                placeholder="Search by staff name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-auto max-w-lg py-2 px-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* Paid/Unpaid Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveSection("unpaid")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeSection === "unpaid"
                      ? "bg-red-500 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Unpaid Wages ({Object.keys(unpaidGroupedData).length})
                </button>
                <button
                  onClick={() => setActiveSection("paid")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeSection === "paid"
                      ? "bg-green-500 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Paid Wages ({Object.keys(paidGroupedData).length})
                </button>
              </div>

              {/* Active Operation Display */}
              <div className="text-sm bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                <span className="font-semibold text-blue-700">Operation:</span>
                <span className="ml-2 bg-blue-100 px-2 py-1 rounded text-blue-800 font-medium">
                  {activeTab.toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            !loading && <p className="text-center text-gray-500">No operations found.</p>
          )}

          <hr className="my-6" />

          {/* Main Content Area */}
          {loading ? (
            <p className="text-center text-gray-500">Loading wages...</p>
          ) : error ? (
            <p className="text-center text-red-500">Error: {error}</p>
          ) : selectedOperator ? (
            /* Operator Details View (Drill Down) */
            <OperatorDetails
              operatorName={selectedOperator}
              jobs={operatorJobs}
              onBack={handleBackButtonClick}
              activeTab={activeTab}
              handleViewDetails={handleViewDetails}
            />
          ) : (
            /* Operator List View */
            <div>
              {/* Unpaid Section */}
              {activeSection === "unpaid" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      Unpaid {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Wages
                    </h3>
                    <span className="text-sm text-gray-600 bg-red-50 px-3 py-1 rounded-full">
                      {Object.keys(unpaidGroupedData).length} operators with unpaid wages
                    </span>
                  </div>

                  {Object.keys(unpaidGroupedData).length === 0 ? (
                    <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-green-600 text-lg font-medium">All wages have been paid!</div>
                      <div className="text-green-500 text-sm mt-1">No unpaid {activeTab} wages found.</div>
                    </div>
                  ) : (
                    <OperatorList
                      groupedData={unpaidGroupedData}
                      pendingBalances={pendingBalances}
                      onOperatorClick={handleOperatorClick}
                      onViewDetails={handleViewDetails}
                      onGenerateReceipt={handleGenerateReceiptClick}
                      onReprintReceipt={handleReprintReceipt}
                      activeTab={activeTab}
                      showPayButton={true}
                    />
                  )}
                </div>
              )}

              {/* Paid Section */}
              {activeSection === "paid" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      Paid {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Wages
                    </h3>
                    <span className="text-sm text-gray-600 bg-green-50 px-3 py-1 rounded-full">
                      {Object.keys(paidGroupedData).length} payment entries
                    </span>
                  </div>

                  {Object.keys(paidGroupedData).length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-gray-600 text-lg font-medium">No paid wages yet</div>
                      <div className="text-gray-500 text-sm mt-1">Paid {activeTab} wages will appear here after payments.</div>
                    </div>
                  ) : (
                    <OperatorList
                      groupedData={paidGroupedData}
                      pendingBalances={pendingBalances}
                      onOperatorClick={handleOperatorClick}
                      onViewDetails={handleViewDetails}
                      onGenerateReceipt={() => {}} // No pay button for paid entries
                      onReprintReceipt={handleReprintReceipt}
                      activeTab={activeTab}
                      showPayButton={false}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      <SizeDetailsModal 
        show={showSizeModal} 
        onClose={() => setShowSizeModal(false)} 
        data={modalData} 
      />
      
      <PaymentConfirmationModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmit={handlePaymentAndPrint}
        data={paymentData}
        onDataChange={setPaymentData}
      />
      
      {/* Wage Slip for Printing (Hidden) */}
      {entryToPrint && (
        <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
          <WageSlip ref={slipRef} entry={entryToPrint} sizeDetails={sizeDetailsToPrint} />
        </div>
      )}
    </div>
  );
};

export default ViewAllWages;