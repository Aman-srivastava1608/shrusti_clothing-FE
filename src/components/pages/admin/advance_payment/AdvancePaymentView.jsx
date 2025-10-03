import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { FaEdit, FaTimesCircle, FaEye } from "react-icons/fa";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const AdvancePaymentView = () => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [paidPayments, setPaidPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Passbook/Ledger states
  const [showPassbookModal, setShowPassbookModal] = useState(false);
  const [passbookData, setPassbookData] = useState(null);
  const [passbookLoading, setPassbookLoading] = useState(false);

  const [searchName, setSearchName] = useState("");
  const [searchAmount, setSearchAmount] = useState("");

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("branchToken");

      if (!token) {
        setError("No authentication token found. Please login again.");
        return;
      }

      const pendingRes = await axios.get(
        `${apiBaseUrl}/api/advance-payments/pending`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );

      const paidRes = await axios.get(`${apiBaseUrl}/api/advance-payments/paid`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      // CONSOLIDATE PENDING PAYMENTS BY STAFF (Remove Duplicates)
      if (pendingRes.data.success && Array.isArray(pendingRes.data.advance_payments)) {
        const staffWisePayments = {};
        
        pendingRes.data.advance_payments.forEach(payment => {
          const staffId = payment.staff_id;
          
          if (!staffWisePayments[staffId]) {
            staffWisePayments[staffId] = {
              id: `staff_${staffId}`, // Unique ID for staff
              staff_id: staffId,
              staff_name: payment.staff_name,
              aadhar_number: payment.aadhar_number,
              pan_number: payment.pan_number,
              mobile_number: payment.mobile_number,
              amount: 0,
              payment_method: payment.payment_method,
              payment_date: payment.payment_date,
              individual_payments: [], // Keep track of individual payments
              total_entries: 0
            };
          }
          
          // Add to consolidated amount
          staffWisePayments[staffId].amount += parseFloat(payment.amount || 0);
          staffWisePayments[staffId].individual_payments.push(payment);
          staffWisePayments[staffId].total_entries++;
          
          // Keep latest payment date
          if (new Date(payment.payment_date) > new Date(staffWisePayments[staffId].payment_date)) {
            staffWisePayments[staffId].payment_date = payment.payment_date;
          }
        });

        const consolidatedPending = Object.values(staffWisePayments);
        setPendingPayments(consolidatedPending);
      } else {
        setPendingPayments([]);
      }

      // Keep paid payments as individual records
      if (paidRes.data.success && Array.isArray(paidRes.data.paid_payments)) {
        setPaidPayments(paidRes.data.paid_payments);
      } else {
        setPaidPayments([]);
      }

    } catch (err) {
      console.error("Error fetching payments:", err);

      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
        localStorage.removeItem("branchToken");
      } else if (err.response?.status === 404) {
        setError("Service not available. Please contact support.");
      } else if (err.code === "ECONNABORTED") {
        setError("Request timeout. Please check your internet connection.");
      } else {
        setError("Failed to load payments. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewPassbook = async (staffId, staffName) => {
    try {
      setPassbookLoading(true);
      const token = localStorage.getItem("branchToken");

      const response = await axios.get(
        `${apiBaseUrl}/api/advance-payments/ledger/${staffId}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000 
        }
      );

      if (response.data.success) {
        setPassbookData({ 
          staffName, 
          entries: response.data.ledger || [],
          currentBalance: response.data.currentBalance || 0
        });
        setShowPassbookModal(true);
      } else {
        alert(response.data.error || "Failed to fetch passbook data.");
      }
    } catch (err) {
      console.error("Error fetching passbook:", err);
      alert("Failed to fetch passbook data: " + (err.response?.data?.error || err.message));
    } finally {
      setPassbookLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handlePayClick = (payment) => {
    setCurrentPayment(payment);
    setAmountPaid("");
    setShowModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!currentPayment || !amountPaid) {
      alert("Please enter a valid amount");
      return;
    }

    const amountNum = parseFloat(amountPaid);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid positive amount");
      return;
    }

    if (amountNum > parseFloat(currentPayment.amount)) {
      alert("Amount paid cannot exceed pending amount");
      return;
    }

    try {
      setPaymentLoading(true);
      const token = localStorage.getItem("branchToken");

      if (!token) {
        alert("Session expired. Please login again.");
        return;
      }

      // Handle consolidated staff payments - process individual payments
      if (currentPayment.individual_payments && currentPayment.individual_payments.length > 0) {
        let remainingAmount = amountNum;
        let processedPayments = 0;
        
        // Process payments in FIFO order (oldest first)
        const sortedPayments = [...currentPayment.individual_payments].sort(
          (a, b) => new Date(a.payment_date) - new Date(b.payment_date)
        );

        for (const individualPayment of sortedPayments) {
          if (remainingAmount <= 0) break;

          const paymentAmount = parseFloat(individualPayment.amount);
          const amountToProcess = Math.min(remainingAmount, paymentAmount);

          try {
            const response = await axios.post(
              `${apiBaseUrl}/api/advance-payments/pay-amount`,
              {
                paymentId: individualPayment.id,
                amountPaid: amountToProcess,
              },
              {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000,
              }
            );

            if (response.data.success) {
              remainingAmount -= amountToProcess;
              processedPayments++;
            } else {
              throw new Error(response.data.error || "Payment processing failed");
            }
          } catch (err) {
            console.error(`Failed to process payment ${individualPayment.id}:`, err);
            throw err;
          }
        }

        if (processedPayments > 0) {
          alert(`Payment recorded successfully! Processed ${processedPayments} payment(s).`);
          setShowModal(false);
          setAmountPaid("");
          setCurrentPayment(null);
          await fetchPayments(); // Refresh data
        } else {
          alert("No payments could be processed.");
        }
      } else {
        // Handle single payment (fallback)
        const response = await axios.post(
          `${apiBaseUrl}/api/advance-payments/pay-amount`,
          {
            paymentId: currentPayment.id,
            amountPaid: amountNum,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );

        if (response.data.success) {
          alert("Payment recorded successfully!");
          setShowModal(false);
          setAmountPaid("");
          setCurrentPayment(null);
          await fetchPayments();
        } else {
          alert(response.data.error || "Failed to submit payment");
        }
      }
    } catch (err) {
      console.error("Error submitting payment:", err);

      if (err.response?.status === 401) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("branchToken");
      } else {
        alert(
          err.response?.data?.error || err.message || "Failed to submit payment"
        );
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-black text-white p-8 rounded-2xl shadow-lg w-full max-w-6xl mx-auto">
        <div className="text-center py-8">
          <div className="text-lg">Loading advance payments...</div>
          <div className="mt-2 text-sm text-gray-400">Please wait...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black text-white p-8 rounded-2xl shadow-lg w-full max-w-6xl mx-auto">
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-4">Error</div>
          <div className="text-red-400 mb-4">{error}</div>
          <button
            onClick={fetchPayments}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filterPayments = (payments, isPaid = false) => {
    if (!Array.isArray(payments)) {
      return [];
    }

    return payments.filter((p) => {
      if (!p) return false;

      const matchesName = searchName
        ? (p.staff_name || "").toLowerCase().includes(searchName.toLowerCase())
        : true;

      const amountValue = isPaid ? (p.amount_paid || 0) : (p.amount || 0);
      const matchesAmount = searchAmount
        ? amountValue.toString().startsWith(searchAmount)
        : true;

      return matchesName && matchesAmount;
    });
  };

  return (
    <div className="bg-black text-white p-8 rounded-2xl shadow-lg w-full max-w-6xl mx-auto">
      <h2 className="text-center bg-blue-600 text-white py-3 px-6 rounded-xl mb-6 text-xl font-semibold">
        Advance Payment Status
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-red-900 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">{pendingPayments.length}</div>
          <div className="text-sm text-red-200">Pending Payments</div>
        </div>
        <div className="bg-green-900 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">{paidPayments.length}</div>
          <div className="text-sm text-green-200">Completed Payments</div>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by Staff Name..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by Amount..."
          value={searchAmount}
          onChange={(e) => setSearchAmount(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          {showHistory ? "Hide Paid History" : "Show Paid History"}
        </button>
      </div>

      {!showHistory && (
        <>
          <h3 className="text-lg font-bold mt-8 mb-4">
            Pending Payments ({filterPayments(pendingPayments).length})
          </h3>
          <div className="overflow-x-auto bg-gray-900 rounded-lg">
            {filterPayments(pendingPayments).length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-lg">No pending payments found</div>
                <div className="text-sm mt-2">All advance payments have been processed!</div>
              </div>
            ) : (
              <table className="w-full text-left table-auto">
                <thead>
                  <tr className="bg-gray-800 text-gray-300 uppercase text-sm leading-normal">
                    <th className="py-3 px-6">Staff Name</th>
                    <th className="py-3 px-6">Total Pending</th>
                    <th className="py-3 px-6">Entries</th>
                    <th className="py-3 px-6">Latest Date</th>
                    <th className="py-3 px-6">Action</th>
                  </tr>
                </thead>
                <tbody className="text-gray-400 text-sm font-light">
                  {filterPayments(pendingPayments).map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-gray-700 hover:bg-gray-700 transition-colors"
                    >
                      <td
                        className="py-3 px-6 font-medium text-blue-400 hover:text-blue-200 cursor-pointer"
                        title="View Passbook"
                        onClick={() => handleViewPassbook(payment.staff_id, payment.staff_name)}
                      >
                        {payment.staff_name || "N/A"}
                      </td>
                      <td className="py-3 px-6 text-yellow-400 font-semibold">
                        ₹{parseFloat(payment.amount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-6 text-gray-300">
                        <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                          {payment.total_entries || 1} advance(s)
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        {payment.payment_date
                          ? format(new Date(payment.payment_date), "dd/MM/yyyy")
                          : "N/A"}
                      </td>
                      <td className="py-3 px-6 flex items-center gap-2">
                        <button
                          onClick={() => handlePayClick(payment)}
                          className="text-green-500 hover:text-green-400 transition-colors text-lg"
                          title="Record Payment"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleViewPassbook(payment.staff_id, payment.staff_name)}
                          className="text-blue-500 hover:text-blue-400 transition-colors text-lg"
                          title="View Passbook"
                          disabled={passbookLoading}
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {showHistory && (
        <>
          <h3 className="text-lg font-bold mt-8 mb-4">
            Paid History ({filterPayments(paidPayments, true).length})
          </h3>
          <div className="overflow-x-auto bg-gray-900 rounded-lg">
            {filterPayments(paidPayments, true).length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-lg">No payment history found</div>
                <div className="text-sm mt-2">Completed payments will appear here</div>
              </div>
            ) : (
              <table className="w-full text-left table-auto">
                <thead>
                  <tr className="bg-gray-800 text-gray-300 uppercase text-sm leading-normal">
                    <th className="py-3 px-6">Staff Name</th>
                    <th className="py-3 px-6">Amount Paid</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Payment Method</th>
                  </tr>
                </thead>
                <tbody className="text-gray-400 text-sm font-light">
                  {filterPayments(paidPayments, true).map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-gray-700 hover:bg-gray-700 transition-colors"
                    >
                      <td className="py-3 px-6 font-medium">{payment.staff_name || "N/A"}</td>
                      <td className="py-3 px-6 text-green-400 font-semibold">
                        ₹{parseFloat(payment.amount_paid || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-6">
                        {payment.payment_date
                          ? format(new Date(payment.payment_date), "dd/MM/yyyy")
                          : "N/A"}
                      </td>
                      <td className="py-3 px-6">{payment.payment_method || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Payment Modal */}
      {showModal && currentPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h4 className="text-xl font-bold mb-4 text-center">Record Payment</h4>
            <div className="bg-gray-700 p-4 rounded-lg mb-4">
              <div className="text-sm text-gray-300">Staff Member:</div>
              <div className="text-lg font-semibold text-white">
                {currentPayment.staff_name}
              </div>
              <div className="text-sm text-gray-300 mt-2">Total Pending Amount:</div>
              <div className="text-xl font-bold text-yellow-400">
                ₹{parseFloat(currentPayment.amount || 0).toFixed(2)}
              </div>
              {currentPayment.total_entries && currentPayment.total_entries > 1 && (
                <>
                  <div className="text-sm text-gray-300 mt-2">Individual Advances:</div>
                  <div className="text-sm text-blue-400">
                    {currentPayment.total_entries} separate advance payments
                  </div>
                </>
              )}
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Amount to Pay *</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max={parseFloat(currentPayment.amount || 0)}
                  step="0.01"
                  placeholder="Enter amount to pay"
                  required
                  disabled={paymentLoading}
                />
                <div className="text-xs text-gray-400 mt-1">
                  Maximum: ₹{parseFloat(currentPayment.amount || 0).toFixed(2)}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setCurrentPayment(null);
                    setAmountPaid("");
                  }}
                  className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
                  disabled={paymentLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
                  disabled={!amountPaid || parseFloat(amountPaid) <= 0 || paymentLoading}
                >
                  {paymentLoading ? "Processing..." : "Submit Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FIXED Passbook Modal - NO SUMMARY SECTION, LATEST RECORDS FIRST */}
      {showPassbookModal && passbookData && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-5xl w-full mx-4 relative max-h-[90vh] overflow-hidden">
            <button
              onClick={() => setShowPassbookModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <FaTimesCircle size={24} />
            </button>
            
            <h4 className="text-xl font-bold mb-4 text-center text-blue-400">
              Passbook - {passbookData.staffName}
            </h4>

            {/* SHOW ONLY CURRENT BALANCE */}
            {/* <div className="mb-6 text-center">
              <div className="bg-purple-700 p-4 rounded-lg inline-block">
                <div className="text-sm text-purple-200">Current Advance Balance</div>
                <div className={`text-2xl font-bold ${
                  parseFloat(passbookData.currentBalance || 0) >= 0 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  ₹{parseFloat(passbookData.currentBalance || 0).toFixed(2)}
                </div>
              </div>
            </div> */}

            <div className="max-h-[60vh] overflow-y-auto mt-6">
              {passbookLoading ? (
                <div className="text-center py-8">
                  <div className="text-lg">Loading passbook...</div>
                </div>
              ) : (
                <table className="w-full text-left table-auto">
                  <thead className="sticky top-0 bg-gray-700">
                    <tr className="text-gray-300 uppercase text-sm">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3 text-center">Credit (+)</th>
                      <th className="py-3 px-3 text-center">Debit (-)</th>
                      <th className="py-3 px-3 text-center">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-400 text-sm">
                    {!passbookData.entries || passbookData.entries.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-500">
                          No transactions found for this staff member.
                        </td>
                      </tr>
                    ) : (
                      passbookData.entries.map((entry, index) => (
                        <tr key={entry.id || index} className="border-b border-gray-600 hover:bg-gray-700">
                          <td className="py-3 px-3 text-gray-300">
                            {format(new Date(entry.date), "dd/MM/yyyy")}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-white">{entry.type}</div>
                            <div className="text-xs text-gray-400">{entry.description}</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {entry.credit_amount > 0 && (
                              <span className="text-green-400 font-semibold">
                                +₹{parseFloat(entry.credit_amount).toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {entry.debit_amount > 0 && (
                              <span className="text-red-400 font-semibold">
                                -₹{parseFloat(entry.debit_amount).toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`font-bold ${
                              parseFloat(entry.running_balance) >= 0 
                                ? 'text-blue-400' 
                                : 'text-orange-400'
                            }`}>
                              ₹{parseFloat(entry.running_balance).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowPassbookModal(false)}
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancePaymentView;