import React from 'react';
import { Eye, FileText } from "lucide-react";

const WageTable = ({
    wageData,
    loading,
    error,
    activeTab,
    searchQuery,
    pendingBalances,
    payableAmounts,
    setPayableAmounts,
    handleViewDetails,
    handleViewTotalDetails,
    handleGenerateReceiptClick,
    handlePrintSingleReceipt,
    handlePrintTotalReceipt
}) => {
    const isSingerTab = activeTab === "singer";
    const isFlatlockTab = activeTab === "flatlock";
    const isOverlockTab = activeTab === "overlock";
    const isCuttingTab = activeTab === "cutting";

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

    if (loading) {
        return <p className="text-center text-gray-500">Loading wages...</p>;
    }
    if (error) {
        return <p className="text-center text-red-500">Error: {error}</p>;
    }
    if (filteredWages.length === 0) {
        return <p className="text-center text-gray-500">No wage entries found for this operation and date.</p>;
    }

    if (isCuttingTab) {
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                    <thead>
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
                    <thead>
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
            const date = new Date(wage.date).toLocaleDateString('en-GB');
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
                    <thead>
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
                                                    <td className="py-2 px-4 border-b text-sm text-gray-700">
                                                        {parseFloat(wage.flatlock_gross_amount || 0).toFixed(2)}
                                                    </td>
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
            const date = new Date(wage.date).toLocaleDateString('en-GB');
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
                    <thead>
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
                                                    <td className="py-2 px-4 border-b text-sm text-gray-700">
                                                        {parseFloat(wage.overlock_gross_amount || 0).toFixed(2)}
                                                    </td>
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
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                    <thead>
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

export default WageTable;