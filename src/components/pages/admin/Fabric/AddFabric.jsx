import React, { useState, useEffect, useRef } from 'react';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Helper function to decode JWT token without an external library
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

// Helper function to get today's date in DD/MM/YYYY format
const getTodayDateDDMMYYYY = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

// Function to generate a 10-digit unique number
const generateUniqueNumber = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

// Custom Barcode component to replace the external library
const SimpleBarcode = ({ value, width = 140, height = 80 }) => {
  const generateSvg = (code) => {
    // This is a simplified pattern for a barcode.
    const barData = code.split('').map(char => {
      const num = parseInt(char, 10);
      return [
        { width: num * 0.5 + 1, type: 'bar' },
        { width: (9 - num) * 0.5 + 1, type: 'space' }
      ];
    }).flat();

    let xPosition = 0;
    const rects = barData.map((d, index) => {
      const rect = d.type === 'bar' ? (
        <rect
          key={index}
          x={xPosition}
          y="0"
          width={d.width}
          height={height}
          fill="black"
        />
      ) : null;
      xPosition += d.width;
      return rect;
    }).filter(Boolean);

    const totalWidth = xPosition;

    return (
      <svg width={totalWidth} height={height} viewBox={`0 0 ${totalWidth} ${height}`}>
        {rects}
      </svg>
    );
  };

  return (
    <div className="p-2">
      {generateSvg(value)}
    </div>
  );
};

// New Toast Notification Component
const ToastNotification = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Notification will disappear after 3 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl bg-gray-800 text-white shadow-xl flex items-center space-x-2 transition-all duration-300 ease-in-out transform">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.85-1.423 2.5-2.903l-4.5-13a2 2 0 00-3.5 0l-4.5 13c-.35 1.48 1.05 2.903 2.5 2.903z" />
      </svg>
      <p className="font-semibold">{message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// Custom Modal Component (for full-screen, blocking alerts)
const CustomModal = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 shadow-xl w-96 text-gray-800">
      <p className="text-lg mb-4">{message}</p>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

// Main component that displays the form and barcode view
export default function App() {
  const receiptRef = useRef(null);
  const barcodeRef = useRef(null);
  const [formData, setFormData] = useState({
    uniqueNumber: '',
    supplierName: '',
    supplierShortName: '',
    invoiceNo: '',
    date: getTodayDateDDMMYYYY(),
    weightOfMaterial: '',
    fabricType: '',
  });
  const [barcodeData, setBarcodeData] = useState(null);
  const [weightError, setWeightError] = useState('');
  const [dateError, setDateError] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [branchId, setBranchId] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [fabricTypes, setFabricTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierShortName, setNewSupplierShortName] = useState('');
  const [infoMessage, setInfoMessage] = useState({ show: false, message: '', isToast: false });

  useEffect(() => {
    const token = localStorage.getItem("branchToken");
    if (token) {
      const decoded = decodeJwt(token);
      if (decoded && decoded.branch_id) {
        setBranchId(decoded.branch_id);
      } else {
        console.error("Failed to decode token or get branch ID.");
      }
    }
  }, []);

  const fetchAllData = async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [historyResponse, suppliersResponse, fabricTypesResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/receipts?branchId=${branchId}`),
        fetch(`${apiBaseUrl}/api/receipts/suppliers?branchId=${branchId}`),
        fetch(`${apiBaseUrl}/api/receipts/fabric-types?branchId=${branchId}`)
      ]);

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistory(historyData);
      }
      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json();
        setSuppliers(suppliersData);
      }
      if (fabricTypesResponse.ok) {
        const fabricTypesData = await fabricTypesResponse.json();
        setFabricTypes(fabricTypesData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) {
      const duplicateData = localStorage.getItem("duplicateData");
      if (duplicateData) {
        const parsedData = JSON.parse(duplicateData);
        setFormData({
          uniqueNumber: generateUniqueNumber(),
          supplierName: parsedData.supplier_name,
          supplierShortName: parsedData.supplier_short_name,
          invoiceNo: parsedData.invoice_no,
          date: getTodayDateDDMMYYYY(),
          weightOfMaterial: parsedData.weight_of_material,
          fabricType: parsedData.fabric_type,
        });
        localStorage.removeItem("duplicateData");
        setInfoMessage({ show: true, message: "Duplicate data loaded. Please review and save.", isToast: true });
      } else {
        setFormData(prev => ({ ...prev, uniqueNumber: generateUniqueNumber() }));
      }
      fetchAllData();
    }
  }, [branchId]);

  const handleAddSupplier = () => {
    setShowModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!newSupplierName || !newSupplierShortName || !branchId) {
      setInfoMessage({ show: true, message: 'All fields and branch ID are required!', isToast: false });
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/receipts/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_name: newSupplierName,
          supplier_short_name: newSupplierShortName,
          branchId: branchId
        }),
      });
      if (!response.ok) throw new Error('Failed to add supplier.');

      const result = await response.json();
      if (result.error) {
        setInfoMessage({ show: true, message: result.error, isToast: false });
        return;
      }

      await fetchAllData();

      setFormData(prev => ({
        ...prev,
        supplierName: newSupplierName,
        supplierShortName: newSupplierShortName,
      }));

      setShowModal(false);
      setNewSupplierName('');
      setNewSupplierShortName('');
      setInfoMessage({ show: true, message: 'Supplier added successfully!', isToast: true });
    } catch (error) {
      console.error('Error adding supplier:', error);
      setInfoMessage({ show: true, message: 'Failed to add supplier. It might already exist.', isToast: false });
    }
  };

  const handleAddFabricType = async () => {
    if (!formData.fabricType || !branchId) {
      setInfoMessage({ show: true, message: 'Fabric type and branch ID are required!', isToast: false });
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/receipts/fabric-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fabric_type_name: formData.fabricType,
          branchId: branchId
        }),
      });
      if (!response.ok) throw new Error('Failed to add fabric type.');

      const result = await response.json();
      if (result.error) {
        setInfoMessage({ show: true, message: result.error, isToast: false });
        return;
      }

      await fetchAllData();
      setInfoMessage({ show: true, message: 'Fabric type added successfully!', isToast: true });
    } catch (error) {
      console.error('Error adding fabric type:', error);
      setInfoMessage({ show: true, message: 'Failed to add fabric type. It might already exist.', isToast: false });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'date') {
      const sanitizedValue = value.replace(/[^0-9]/g, '');
      let formattedValue = '';
      if (sanitizedValue.length > 0) formattedValue += sanitizedValue.substring(0, 2);
      if (sanitizedValue.length > 2) formattedValue += '/' + sanitizedValue.substring(2, 4);
      if (sanitizedValue.length > 4) formattedValue += '/' + sanitizedValue.substring(4, 8);
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    } else if (name === 'supplierName') {
      const selectedSupplier = suppliers.find(s => s.supplier_name === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        supplierShortName: selectedSupplier ? selectedSupplier.supplier_short_name : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.uniqueNumber || !branchId) {
      setInfoMessage({ show: true, message: "Unique Number or Branch ID not generated.", isToast: false });
      return;
    }

    const supplier = suppliers.find(s => s.supplier_name === formData.supplierName);
    if (!supplier) {
      setInfoMessage({ show: true, message: 'Please select a valid supplier name from the list or add a new one.', isToast: false });
      return;
    }
    
    // Check if fabric type exists
    const fabricTypeExists = fabricTypes.some(f => f.fabric_type_name === formData.fabricType);
    if (!fabricTypeExists) {
        setInfoMessage({ show: true, message: 'Please add the fabric type first.', isToast: false });
        return;
    }

    const weightRegex = /^\d+(\.\d+)?$/;
    if (!weightRegex.test(formData.weightOfMaterial)) {
      setWeightError('Please enter a valid weight (e.g., 5, 5.25).');
      return;
    } else {
      setWeightError('');
    }

    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(formData.date)) {
      setDateError('Please enter a valid date in DD/MM/YYYY format.');
      return;
    } else {
      setDateError('');
    }

    // Correcting date format for the backend
    const [day, month, year] = formData.date.split('/');
    const formattedDate = `${year}-${month}-${day}`;

    try {
      const response = await fetch(`${apiBaseUrl}/api/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uniqueNumber: formData.uniqueNumber,
          supplierName: formData.supplierName,
          supplierShortName: formData.supplierShortName,
          invoiceNo: formData.invoiceNo,
          date: formattedDate, // <--- Corrected
          weightOfMaterial: formData.weightOfMaterial,
          fabricType: formData.fabricType,
          branchId: branchId,
          supplierId: supplier.id,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit data to the backend.');
      }

      setBarcodeData({ value: formData.uniqueNumber, display: formData });
      setInfoMessage({ show: true, message: 'Receipt submitted successfully!', isToast: true });

      const updatedHistoryResponse = await fetch(`${apiBaseUrl}/api/receipts?branchId=${branchId}`);
      if (updatedHistoryResponse.ok) {
        const updatedData = await updatedHistoryResponse.json();
        setHistory(updatedData);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setInfoMessage({ show: true, message: error.message || 'Failed to submit data.', isToast: false });
    }
  };

  const handleGenerateNew = () => {
    setBarcodeData(null);
    setFormData({
      uniqueNumber: generateUniqueNumber(),
      supplierName: '',
      supplierShortName: '',
      invoiceNo: '',
      date: getTodayDateDDMMYYYY(),
      weightOfMaterial: '',
      fabricType: '',
    });
    setWeightError('');
    setDateError('');
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (printContent) {
      const originalContents = document.body.innerHTML;
      const printContents = `<div style="padding: 20px; font-family: Inter, sans-serif;">${printContent.innerHTML}</div>`;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const handleDownload = () => {
    if (!barcodeData) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const padding = 20;
    const width = 400;
    const height = 250;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Receipt', width / 2, 30);

    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(barcodeData.display.date, padding, 60);
    ctx.textAlign = 'right';
    const year = formData.date.slice(-4);
    const formattedId = `${formData.supplierShortName}-${formData.invoiceNo}-${year}`;
    ctx.fillText(formattedId, width - padding, 60);
    ctx.textAlign = 'left';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(`Supplier: ${formData.supplierName}`, padding, 90);
    ctx.fillText(`Invoice No.: ${formData.invoiceNo}`, padding, 110);
    ctx.fillText(`Fabric type: ${formData.fabricType}`, width / 2 + padding, 90);
    ctx.fillText(`Weight: ${formData.weightOfMaterial} kg`, width / 2 + padding, 110);

    const barcodeSvgElement = barcodeRef.current.querySelector('svg');
    if (barcodeSvgElement) {
      const svgString = new XMLSerializer().serializeToString(barcodeSvgElement);
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      img.onload = () => {
        ctx.drawImage(img, width / 2 - img.width / 2, 120);
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(barcodeData.value, width / 2, 220);
        const link = document.createElement('a');
        link.download = `receipt_${formData.uniqueNumber}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    }
  };

  const handleViewBarcode = (item) => {
    setBarcodeData({
      value: item.unique_number,
      display: {
        supplierName: item.supplier_name,
        date: item.date,
        fabricType: item.fabric_type,
        invoiceNo: item.invoice_no, 
        weightOfMaterial: item.weight_of_material,
        supplierShortName: item.supplier_short_name
      }
    });
    setFormData({
      uniqueNumber: item.unique_number,
      supplierName: item.supplier_name,
      supplierShortName: item.supplier_short_name,
      invoiceNo: item.invoice_no,
      date: item.date,
      weightOfMaterial: item.weight_of_material,
      fabricType: item.fabric_type,
    });
  };

  if (loading || branchId === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-800 text-lg font-semibold">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-sans antialiased bg-gray-100 text-white">
      <main className="max-w-xl w-full mx-auto">
        {barcodeData ? (
          <div className="flex flex-col items-center justify-center p-4">
            <div className="flex space-x-4 mb-4">
              <button
                onClick={handleDownload}
                className="bg-[#6a053c] hover:bg-[#800040] text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Download
              </button>
              <button
                onClick={handlePrint}
                className="bg-[#6a053c] hover:bg-[#800040] text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Print
              </button>
            </div>
            <div className="max-w-md w-full bg-[#0071bc] shadow-lg rounded-3xl p-6">
              <h2 className="text-xl text-center text-white font-bold mb-4">Receipt</h2>
              <div ref={receiptRef} className="bg-white rounded-3xl p-6 flex flex-col justify-between items-center h-full">
                {
                  (() => {
                    const year = formData.date.slice(-4);
                    const formattedId = `${formData.supplierShortName}-${formData.invoiceNo}-${year}`;
                    return (
                      <div className="text-gray-900 text-sm w-full">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-bold">{formData.date}</p>
                          <p className="font-bold text-lg">{formattedId}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4">
                          <p><strong>Supplier:</strong> {formData.supplierName}</p>
                          <p><strong>Fabric type:</strong> {formData.fabricType}</p>
                          <p><strong>Invoice No.:</strong> {formData.invoiceNo}</p>
                          <p><strong>Weight:</strong> {formData.weightOfMaterial} kg</p>
                        </div>
                      </div>
                    );
                  })()
                }
                <div ref={barcodeRef} className="flex flex-col items-center mt-6">
                  <SimpleBarcode value={barcodeData.value} height={80} width={140} />
                  <p className="text-center font-mono text-xl text-gray-900 tracking-widest">
                    {barcodeData.value}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleGenerateNew}
              className="mt-8 bg-[#0071bc] text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Add Another Fabric
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-full p-4">
            <div className="w-full bg-[#0071bc] shadow-lg rounded-xl p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-2xl font-bold mb-6 text-center">Generate Fabric Receipt</h2>
                
                {/* Supplier full name input with add button */}
                <div className="space-y-1">
                  <label className="block text-white font-semibold">Supplier full name</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      name="supplierName"
                      value={formData.supplierName}
                      onChange={handleChange}
                      placeholder="Input"
                      className="flex-1 bg-white border border-[#004a79] p-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071bc]"
                      list="supplier-names"
                      required
                    />
                    <datalist id="supplier-names">
                      {suppliers.map(s => (
                        <option key={s.id} value={s.supplier_name} />
                      ))}
                    </datalist>
                    <button
                      type="button"
                      onClick={handleAddSupplier}
                      className="bg-[#6a053c] hover:bg-[#800040] text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Supplier short name - now editable */}
                <div className="space-y-1">
                  <label className="block text-white font-semibold">Supplier short name</label>
                  <input
                    type="text"
                    name="supplierShortName"
                    value={formData.supplierShortName}
                    onChange={handleChange}
                    placeholder="autofills when you select a supplier"
                    className="w-full bg-white border border-[#004a79] p-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071bc]"
                    disabled
                    required
                  />
                </div>

                {/* Invoice Number */}
                <div className="space-y-1">
                  <label className="block text-white font-semibold">Invoice Number</label>
                  <input
                    type="text"
                    name="invoiceNo"
                    value={formData.invoiceNo}
                    onChange={handleChange}
                    placeholder="Input"
                    className="w-full bg-white border border-[#004a79] p-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071bc]"
                    required
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="block text-white font-semibold">Date</label>
                  <input
                    type="text"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    placeholder="dd/mm/yyyy"
                    className={`w-full bg-white border p-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071bc] ${dateError ? 'border-red-500' : 'border-[#004a79]'}`}
                    maxLength="10"
                    required
                  />
                  {dateError && <p className="text-red-400 text-sm mt-1">{dateError}</p>}
                </div>

                {/* Weight of Material */}
                <div className="space-y-1">
                  <label className="block text-white font-semibold">Weight of material (kg)</label>
                  <input
                    type="text"
                    name="weightOfMaterial"
                    value={formData.weightOfMaterial}
                    onChange={handleChange}
                    placeholder="Input Number (e.g., 5, 5.45)"
                    className={`w-full bg-white border p-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071bc] ${weightError ? 'border-red-500' : 'border-[#004a79]'}`}
                    required
                  />
                  {weightError && <p className="text-red-400 text-sm mt-1">{weightError}</p>}
                </div>

                {/* Fabric type input with add button */}
                <div className="space-y-1">
                  <label className="block text-white font-semibold">Fabric type</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      name="fabricType"
                      value={formData.fabricType}
                      onChange={handleChange}
                      placeholder="Fabric type"
                      className="flex-1 bg-white border border-[#004a79] p-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071bc]"
                      list="fabric-types"
                      required
                    />
                    <datalist id="fabric-types">
                      {fabricTypes.map(f => (
                        <option key={f.id} value={f.fabric_type_name} />
                      ))}
                    </datalist>
                    <button
                      type="button"
                      onClick={handleAddFabricType}
                      className="bg-[#6a053c] hover:bg-[#800040] text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Submit button with gradient style */}
                <button
                  type="submit"
                  className="w-full text-white font-bold py-2 px-4 rounded-xl transition-all"
                  style={{
                    background: 'linear-gradient(to right, #facc15, #eab308)',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                  }}
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        )}
        
        {/* The Modal for adding supplier names */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-xl w-96">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Add New Supplier</h3>
              <form onSubmit={handleModalSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071bc]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Short Name</label>
                  <input
                    type="text"
                    value={newSupplierShortName}
                    onChange={(e) => setNewSupplierShortName(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071bc]"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#6a053c] hover:bg-[#800040] text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {infoMessage.show && infoMessage.isToast ? (
          <ToastNotification message={infoMessage.message} onClose={() => setInfoMessage({ show: false, message: '', isToast: false })} />
        ) : infoMessage.show ? (
          <CustomModal message={infoMessage.message} onClose={() => setInfoMessage({ show: false, message: '', isToast: false })} />
        ) : null}
      </main>
    </div>
  );
}