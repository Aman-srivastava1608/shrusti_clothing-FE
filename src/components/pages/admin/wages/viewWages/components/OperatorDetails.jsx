import React, { useState } from "react";
import { X } from "lucide-react";

// Modal component for viewing details
const DetailsModal = ({ title, details, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-lg w-full relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800">
          <X size={24} />
        </button>
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <div className="space-y-2">
          {details.map((detail, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
              <span className="font-semibold text-gray-700">{detail.label}:</span>
              <span className="text-gray-600">{detail.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const OperatorDetails = ({ operatorName, jobs, onBack, activeTab }) => {
  const [modalData, setModalData] = useState(null);

  const handleViewDetails = (sizeWiseEntry, extraPcs) => {
    let details = [];
    try {
      const parsedSizeDetails = sizeWiseEntry && typeof sizeWiseEntry === 'string' ? JSON.parse(sizeWiseEntry) : sizeWiseEntry;

      if (parsedSizeDetails) {
        details = Object.entries(parsedSizeDetails).map(([size, pieces]) => ({
          label: `Size ${size}`,
          value: `${pieces} Pieces`,
        }));
      }
      if (extraPcs > 0) {
        details.push({
          label: 'Extra Pieces',
          value: `${extraPcs} Pieces`,
        });
      }
    } catch (error) {
      console.error("Error parsing size data:", error);
      details.push({
        label: 'Error',
        value: 'Could not load details.'
      });
    }

    setModalData({
      title: 'Pieces Breakdown',
      details: details,
    });
  };

  const closeModal = () => {
    setModalData(null);
  };

  let sNo = 0;

  const showSingerColumn = activeTab === 'flatlock' || activeTab === 'overlock';

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
          &larr; Back to Operator List
        </button>
        <h3 className="text-2xl font-bold ml-4 text-gray-800">Entries for {operatorName}</h3>
      </div>
      <div className="overflow-x-auto bg-white rounded-lg shadow-md p-4">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-200">
            <tr>
              <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">S. No.</th>
              <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Date</th>
              <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Product</th>
              {showSingerColumn && (
                <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Singer Name</th>
              )}
              <th className="py-3 px-4 border-b text-center text-sm font-semibold text-gray-600">Pieces</th>
              <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Gross Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((wage) => {
              const grossAmountKey = activeTab === 'flatlock' ? 'flatlock_gross_amount' : (activeTab === 'overlock' ? 'overlock_gross_amount' : 'gross_amount');
              const date = new Date(wage.date || wage.created_at).toLocaleDateString("en-GB");
              
              const hasDetails = (wage.size_wise_entry && Object.keys(wage.size_wise_entry).length > 0) || (wage.extra_pcs && wage.extra_pcs > 0);

              return (
                <tr key={wage.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 border-b text-sm text-gray-700">{++sNo}</td>
                  <td className="py-3 px-4 border-b text-sm text-gray-700">{date}</td>
                  <td className="py-3 px-4 border-b text-sm text-gray-700">{wage.product_name}</td>
                  {showSingerColumn && (
                    <td className="py-3 px-4 border-b text-sm text-gray-700">{wage.staff_name || '-'}</td>
                  )}
                  <td 
                    className={`py-3 px-4 border-b text-sm text-blue-600 font-bold text-center ${hasDetails ? 'cursor-pointer hover:underline' : ''}`}
                    onClick={() => hasDetails && handleViewDetails(wage.size_wise_entry, wage.extra_pcs)} 
                  >
                    {wage.total_pieces || wage.total_pcs}
                  </td>
                  <td className="py-3 px-4 border-b text-sm text-gray-700">{parseFloat(wage[grossAmountKey] || wage.gross_amount || 0).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalData && (
        <DetailsModal 
          title={modalData.title}
          details={modalData.details}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default OperatorDetails;