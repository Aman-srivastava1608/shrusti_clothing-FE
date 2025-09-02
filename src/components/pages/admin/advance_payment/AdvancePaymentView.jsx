import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { FaEdit } from "react-icons/fa";
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

  const [searchName, setSearchName] = useState("");
  const [searchAmount, setSearchAmount] = useState("");

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("branchToken");

      const pendingRes = await axios.get(
        `${apiBaseUrl}/api/advance-payment/pending `,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingPayments(pendingRes.data);

      const paidRes = await axios.get(
       `${apiBaseUrl}/api/advance-payment/paid`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPaidPayments(paidRes.data);
    } catch (err) {
      console.error("Error fetching payments:", err);
      setError("Failed to fetch payment data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handlePayClick = (payment) => {
    setCurrentPayment(payment);
    setShowModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("branchToken");

      const payload = {
        paymentId: currentPayment.id,
        amountPaid: parseFloat(amountPaid),
      };

      await axios.post(
        `${apiBaseUrl}/api/advance-payment/pay-amount`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Payment recorded successfully!");
      setShowModal(false);
      setAmountPaid("");
      fetchPayments();
    } catch (err) {
      console.error("Error submitting payment:", err);
      alert(err.response?.data?.error || "Failed to submit payment");
    }
  };

  if (loading) return <div className="text-white">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  // ========== Filter function ==========
  const filterPayments = (payments, isPaid = false) => {
    return payments.filter((p) => {
      const matchesName = searchName
        ? p.staff_name.toLowerCase().includes(searchName.toLowerCase())
        : true;

      const amountValue = isPaid ? p.amount_paid : p.amount;
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

      {/* Search Bars */}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by Staff Name..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white flex-1"
        />
        <input
          type="text"
          placeholder="Filter by Amount..."
          value={searchAmount}
          onChange={(e) => setSearchAmount(e.target.value)}
          className="p-2 rounded bg-gray-700 text-white w-48"
        />
      </div>

      {/* Toggle Button for History */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          {showHistory ? "Hide Paid History" : "Show Paid History"}
        </button>
      </div>

      {/* Pending Payments Table */}
      {!showHistory && (
        <>
          <h3 className="text-lg font-bold mt-8 mb-4">Pending Payments</h3>
          <div className="overflow-x-auto bg-gray-900 rounded-lg">
            <table className="w-full text-left table-auto">
              <thead>
                <tr className="bg-gray-800 text-gray-300 uppercase text-sm leading-normal">
                  <th className="py-3 px-6">Staff Name</th>
                  <th className="py-3 px-6">Pending Amount (₹)</th>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Payment Method</th>
                  <th className="py-3 px-6">Action</th>
                </tr>
              </thead>
              <tbody className="text-gray-400 text-sm font-light">
                {filterPayments(pendingPayments).map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-700 hover:bg-gray-700"
                  >
                    <td className="py-3 px-6">{payment.staff_name}</td>
                    <td className="py-3 px-6">{payment.amount}</td>
                    <td className="py-3 px-6">
                      {format(new Date(payment.payment_date), "dd/MM/yyyy")}
                    </td>
                    <td className="py-3 px-6">{payment.payment_method}</td>
                    <td className="py-3 px-6">
                      <button
                        onClick={() => handlePayClick(payment)}
                        className="text-green-500 hover:text-green-400"
                      >
                        <FaEdit />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Paid History Table */}
      {showHistory && (
        <>
          <h3 className="text-lg font-bold mt-8 mb-4">Paid History</h3>
          <div className="overflow-x-auto bg-gray-900 rounded-lg">
            <table className="w-full text-left table-auto">
              <thead>
                <tr className="bg-gray-800 text-gray-300 uppercase text-sm leading-normal">
                  <th className="py-3 px-6">Staff Name</th>
                  <th className="py-3 px-6">Amount Paid (₹)</th>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Payment Method</th>
                </tr>
              </thead>
              <tbody className="text-gray-400 text-sm font-light">
                {filterPayments(paidPayments, true).map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-700 hover:bg-gray-700"
                  >
                    <td className="py-3 px-6">{payment.staff_name}</td>
                    <td className="py-3 px-6">{payment.amount_paid}</td>
                    <td className="py-3 px-6">
                      {format(new Date(payment.payment_date), "dd/MM/yyyy")}
                    </td>
                    <td className="py-3 px-6">{payment.payment_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
            <h4 className="text-xl font-bold mb-4">
              Record Payment for {currentPayment.staff_name}
            </h4>
            <p className="mb-4">Pending Amount: ₹{currentPayment.amount}</p>
            <form onSubmit={handlePaymentSubmit}>
              <div className="mb-4">
                <label className="block text-gray-300">Amount Paid</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 text-white"
                  min="0"
                  max={currentPayment.amount}
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancePaymentView;
