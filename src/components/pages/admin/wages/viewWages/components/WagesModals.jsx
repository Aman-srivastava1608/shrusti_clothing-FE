import React from "react";

export const SizeDetailsModal = ({ show, onClose, data }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
        <h3 className="text-xl font-bold mb-4 text-center">Size-wise Pieces</h3>
        {data.message ? (
          <p className="text-center text-gray-500">{data.message}</p>
        ) : (
          <ul className="list-disc pl-5 space-y-2">
            {Object.entries(data).map(([size, pieces]) => (
              <li key={size}>
                <strong className="text-gray-700">{size}:</strong>{" "}
                <span className="text-gray-600">{pieces} pcs</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================== Payment Confirmation Modal =====================
export const PaymentConfirmationModal = ({ show, onClose, onSubmit, data, onDataChange }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
        <h3 className="text-xl font-bold mb-4 text-center">Confirm Payment</h3>

        {/* Editable Payable Amount */}
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payable Amount
        </label>
        <input
          type="number"
          value={data.payableAmount}
          onChange={(e) =>
            onDataChange({ ...data, payableAmount: e.target.value })
          }
          className="mt-1 block w-full p-3 border border-gray-300 rounded-xl shadow-sm mb-4"
          required
        />

        <p className="text-sm mb-4 text-gray-600">
          (Gross: ₹{data.grossAmount}, Deduction: ₹{data.deduction || 0})
        </p>

        {/* Payment Mode */}
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Mode
        </label>
        <select
          value={data.paymentType}
          onChange={(e) =>
            onDataChange({ ...data, paymentType: e.target.value })
          }
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
            onClick={onClose}
            className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={
              !data.paymentType || parseFloat(data.payableAmount) <= 0
            }
            className={`px-4 py-2 rounded-lg text-white font-bold transition-colors
              ${
                !data.paymentType || parseFloat(data.payableAmount) <= 0
                  ? "bg-green-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
          >
            Confirm & Generate Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
