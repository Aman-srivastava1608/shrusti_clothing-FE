import React, { useState, useEffect } from "react";
import { hasUnpaidJobs } from "../utils/WagesUtils.js";

const OperatorList = ({
  groupedData,
  onOperatorClick,
  onViewDetails,
  onGenerateReceipt,
  onReprintReceipt,
  activeTab,
  pendingBalances,
  showPayButton = true,
}) => {
  // 🔥 NEW: Track editable payable amounts for each operator
  const [editablePayables, setEditablePayables] = useState({});

  // 🔥 Initialize editable payables when data changes
  useEffect(() => {
    const initialPayables = {};
    Object.entries(groupedData).forEach(([operator, jobs]) => {
      const grossAmountKey =
        activeTab === "flatlock"
          ? "flatlock_gross_amount"
          : activeTab === "overlock"
          ? "overlock_gross_amount"
          : "gross_amount";

      const totalGrossAmount = jobs.reduce(
        (sum, job) => sum + parseFloat(job[grossAmountKey] || 0),
        0
      );

      const pendingAdvance = parseFloat(pendingBalances[operator]) || 0;
      const defaultPayable = totalGrossAmount - pendingAdvance;

      initialPayables[operator] = {
        payable: defaultPayable.toFixed(2),
        advance: pendingAdvance.toFixed(2),
        gross: totalGrossAmount.toFixed(2)
      };
    });
    setEditablePayables(initialPayables);
  }, [groupedData, pendingBalances, activeTab]);

  // 🔥 Handle payable amount change
  const handlePayableChange = (operator, newPayable) => {
    const payableNum = parseFloat(newPayable) || 0;
    const current = editablePayables[operator];
    
    if (!current) return;

    const grossNum = parseFloat(current.gross);
    
    // 🔥 Calculate advance deduction dynamically
    let newAdvance = grossNum - payableNum;
    
    // 🔥 If payable > gross, it means BONUS (negative advance)
    if (payableNum > grossNum) {
      newAdvance = grossNum - payableNum; // Will be negative (bonus)
    }

    setEditablePayables(prev => ({
      ...prev,
      [operator]: {
        ...current,
        payable: newPayable,
        advance: newAdvance.toFixed(2)
      }
    }));
  };

  if (Object.keys(groupedData).length === 0) {
    return (
      <p className="text-center text-gray-500">
        No wage entries found for this operation.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
              S. No.
            </th>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
              Operator Name
            </th>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
              Total Pieces
            </th>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
              Gross Amount (₹)
            </th>
            {showPayButton && (
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
                Pending Advance (₹)
              </th>
            )}
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
              {showPayButton ? "Payable Amount (₹)" : "Amount Paid (₹)"}
            </th>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedData).map(([operator, jobs], index) => {
            const firstJob = jobs[0] || {};

            const totalPieces = jobs.reduce(
              (sum, job) => sum + (job.total_pcs || job.total_pieces || 0),
              0
            );

            const grossAmountKey =
              activeTab === "flatlock"
                ? "flatlock_gross_amount"
                : activeTab === "overlock"
                ? "overlock_gross_amount"
                : "gross_amount";

            const totalGrossAmount = jobs.reduce(
              (sum, job) => sum + parseFloat(job[grossAmountKey] || 0),
              0
            );

            // 🔥 Get editable values
            const currentEditable = editablePayables[operator] || {
              payable: totalGrossAmount.toFixed(2),
              advance: "0.00",
              gross: totalGrossAmount.toFixed(2)
            };

            const displayPayable = parseFloat(currentEditable.payable);
            const displayAdvance = parseFloat(currentEditable.advance);

            // Paid Tab values
            const paidGrossAmount =
              firstJob.paid_gross_amount !== undefined
                ? parseFloat(firstJob.paid_gross_amount)
                : totalGrossAmount;

            const paidFinalAmount =
              firstJob.paid_final_amount !== undefined
                ? parseFloat(firstJob.paid_final_amount)
                : displayPayable;

            const advanceDeducted =
              firstJob.advance_deducted !== undefined
                ? parseFloat(firstJob.advance_deducted)
                : displayAdvance;

            const getPaymentInfo = () => {
              let paymentId = null;
              let paidAt = null;

              switch (activeTab) {
                case "singer":
                  paymentId = firstJob.singer_payment_id;
                  paidAt = firstJob.singer_paid_at;
                  break;
                case "flatlock":
                  paymentId = firstJob.flatlock_payment_id;
                  paidAt = firstJob.flatlock_paid_at;
                  break;
                case "overlock":
                  paymentId = firstJob.overlock_payment_id;
                  paidAt = firstJob.overlock_paid_at;
                  break;
                default:
                  paymentId = firstJob.payment_id;
                  paidAt = firstJob.updated_at;
              }

              return {
                paymentId,
                paidAt,
                paymentType: firstJob.payment_type || "Cash",
              };
            };

            const paymentInfo = getPaymentInfo();

            const baseOperator = operator.includes(" (Payment #")
              ? operator.split(" (Payment #")[0]
              : operator;

            const operatorHasUnpaidJobs = hasUnpaidJobs(
              baseOperator,
              jobs,
              activeTab
            );

            const shouldShowPayButton = showPayButton && operatorHasUnpaidJobs;

            return (
              <tr key={operator} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b text-sm text-gray-700">
                  {index + 1}
                </td>
                <td
                  className="py-2 px-4 border-b text-sm text-blue-600 font-medium cursor-pointer hover:underline"
                  onClick={() => onOperatorClick(operator, jobs)}
                >
                  <div className="flex flex-col">
                    <span>{operator}</span>
                    {!showPayButton && paymentInfo?.paymentId && (
                      <span className="text-xs text-gray-500">
                        Payment ID: {paymentInfo.paymentId}
                      </span>
                    )}
                  </div>
                </td>
                <td
                  className="py-2 px-4 border-b text-sm text-green-600 font-semibold cursor-pointer hover:underline"
                  onClick={() => onViewDetails(jobs, operator)}
                >
                  {totalPieces}
                </td>
                <td className="py-2 px-4 border-b text-sm text-gray-700">
                  ₹
                  {showPayButton
                    ? totalGrossAmount.toFixed(2)
                    : paidGrossAmount.toFixed(2)}
                </td>

                {showPayButton && (
                  <td className="py-2 px-4 border-b text-sm">
                    <div className="flex flex-col">
                      <span className={`font-semibold ${displayAdvance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {displayAdvance >= 0 ? '₹' : '+₹'}
                        {Math.abs(displayAdvance).toFixed(2)}
                      </span>
                      {displayAdvance < 0 && (
                        <span className="text-xs text-green-500">
                          (Bonus Payment)
                        </span>
                      )}
                    </div>
                  </td>
                )}

                <td className="py-2 px-4 border-b text-sm">
                  {showPayButton ? (
                    <div className="flex flex-col gap-2">
                      {/* 🔥 EDITABLE INPUT */}
                      <input
                        type="number"
                        step="0.01"
                        value={currentEditable.payable}
                        onChange={(e) => handlePayableChange(operator, e.target.value)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-green-700 font-bold"
                        placeholder="Enter amount"
                      />
                      <div className="text-xs text-gray-500">
                        {displayAdvance > 0 && (
                          <span className="text-red-500">
                            (₹{displayAdvance.toFixed(2)} advance deducted)
                          </span>
                        )}
                        {displayAdvance < 0 && (
                          <span className="text-green-500">
                            (+₹{Math.abs(displayAdvance).toFixed(2)} bonus added)
                          </span>
                        )}
                        {displayAdvance === 0 && (
                          <span>(No advance adjustment)</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-green-700 font-bold">
                        ₹{paidFinalAmount.toFixed(2)}
                      </span>
                      <div className="text-xs text-gray-500">
                        Paid on:{" "}
                        {paymentInfo.paidAt
                          ? new Date(paymentInfo.paidAt).toLocaleDateString("en-GB")
                          : "--"}
                        {advanceDeducted !== 0 && (
                          <div className="text-xs mt-1">
                            {advanceDeducted > 0 ? (
                              <span className="text-red-500">
                                (₹{advanceDeducted.toFixed(2)} deducted)
                              </span>
                            ) : (
                              <span className="text-green-500">
                                (+₹{Math.abs(advanceDeducted).toFixed(2)} bonus)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </td>

                <td className="py-2 px-4 border-b text-sm">
                  {showPayButton ? (
                    shouldShowPayButton ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // 🔥 Pass calculated advance to receipt generation
                          onGenerateReceipt(operator, jobs, displayAdvance);
                        }}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-green-600"
                      >
                        Pay & Receipt
                      </button>
                    ) : (
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        ✓ All Paid
                      </span>
                    )
                  ) : (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onReprintReceipt &&
                            onReprintReceipt(operator, jobs, {
                              paidGrossAmount,
                              paidFinalAmount,
                              advanceDeducted,
                              paymentInfo,
                            });
                        }}
                        className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-600"
                      >
                        Print Receipt
                      </button>
                      <span className="text-xs text-green-600 font-medium">
                        ✓ Paid by {paymentInfo?.paymentType || "Cash"}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default OperatorList;