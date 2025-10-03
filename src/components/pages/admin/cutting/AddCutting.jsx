import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// ✅ JWT decode helper
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

// ✅ Reusable Modal
const Modal = ({ title, message, onClose }) => {
  if (!message) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-gray-800">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <p className="mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
     </div>
  );
};

const CuttingEntry = () => {
  const [inwardNumber, setInwardNumber] = useState('');
  const [fabricType, setFabricType] = useState('');
  const [weightOfFabric, setWeightOfFabric] = useState('');
  const [color, setColor] = useState(''); // ✅ NEW: Color field
  const [cuttingMaster, setCuttingMaster] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [cuttingStaff, setCuttingStaff] = useState([]);
  const [sizeWiseEntry, setSizeWiseEntry] = useState({});
  const [totalPcs, setTotalPcs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ title: '', message: '' });
  const navigate = useNavigate();
  const { branchId: urlBranchId } = useParams();
  const [branchId, setBranchId] = useState(null);
  const [rangeInput, setRangeInput] = useState('');

  const [grossAmount, setGrossAmount] = useState(0);
  // ✅ REMOVED: paymentType state

  // ✅ Extract branchId from JWT token
  useEffect(() => {
    const token = localStorage.getItem('branchToken');
    if (token) {
      const decoded = decodeJwt(token);
      if (decoded?.branch_id) {
        setBranchId(decoded.branch_id);
      } else {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // ✅ Fetch cutting staff & products
  useEffect(() => {
    if (branchId) {
      const fetchInitialData = async () => {
        try {
          const token = localStorage.getItem('branchToken');
          const headers = { Authorization: `Bearer ${token}` };
          const params = { branch_id: branchId };

          const [staffRes, productsRes] = await Promise.all([
            axios.get(`${apiBaseUrl}/api/staff/by-operation/cutting`, {
              headers,
              params,
            }),
            axios.get(`${apiBaseUrl}/api/products`, {
              headers,
              params,
            }),
          ]);
          setCuttingStaff(staffRes.data);
          setProducts(productsRes.data);
        } catch (error) {
          console.error('Error fetching initial data:', error);
          setModal({
            title: 'Error',
            message: 'An error occurred while fetching initial data.',
          });
        }
      };
      fetchInitialData();
    }
  }, [branchId]);

  // ✅ Calculate ONLY Gross Amount
  useEffect(() => {
    const productData = products.find(
      (p) => p.product_name === selectedProduct
    );
    let rate = 0;
    if (productData?.operations) {
      try {
        const operations = JSON.parse(productData.operations);
        const cuttingOp = operations.find(
          (op) => op.name.toLowerCase().trim() === 'cutting'
        );
        if (cuttingOp && !isNaN(parseFloat(cuttingOp.rate))) {
          rate = parseFloat(cuttingOp.rate);
        }
      } catch (e) {
        console.error('Error parsing product operations:', e);
      }
    }
    const calculatedGross = totalPcs * rate;
    setGrossAmount(calculatedGross);
  }, [selectedProduct, totalPcs, products]);

  // ✅ UPDATED: Check if inward number already used for cutting + Fetch color
  const handleInwardNumberChange = async (e) => {
    const value = e.target.value;
    setInwardNumber(value);

    if (value.length === 10) {
      setLoading(true);
      try {
        const token = localStorage.getItem('branchToken');
        
        // FIRST: Check if this inward number is already used for cutting
        const cuttingCheckRes = await axios.get(
          `${apiBaseUrl}/api/cutting-entry/check-inward/${value}?branchId=${branchId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (cuttingCheckRes.data.alreadyUsed) {
          setFabricType('');
          setWeightOfFabric('');
          setColor(''); // ✅ NEW: Reset color
          setModal({
            title: 'Already Used',
            message: 'This inward number has already been used for cutting operation! ❌',
          });
          setLoading(false);
          return;
        }

        // THEN: Fetch fabric details including color
        const res = await axios.get(
          `${apiBaseUrl}/api/receipts/${value}?branchId=${branchId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const { fabric_type, weight_of_material, color: fabricColor } = res.data; // ✅ NEW: Extract color
        setFabricType(fabric_type);
        setWeightOfFabric(weight_of_material);
        setColor(fabricColor || 'N/A'); // ✅ NEW: Set color
        setModal({ title: 'Success', message: 'Fabric details found and ready for cutting ✅' });
      } catch (error) {
        setFabricType('');
        setWeightOfFabric('');
        setColor(''); // ✅ NEW: Reset color on error
        setModal({
          title: 'Error',
          message: 'Incorrect or missing inward number.',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const sizes = [
    '2-3', '3-4', '4-5', '6-7', '7-8', '9-10', '11-12', '13-14',
  ];

  // ✅ Handle single size entry
  const handleSizeWiseEntryChange = (size, value) => {
    const newSizeWiseEntry = { ...sizeWiseEntry, [size]: value };
    setSizeWiseEntry(newSizeWiseEntry);

    const total = Object.entries(newSizeWiseEntry).reduce(
      (sum, [key, val]) => sum + (parseInt(val, 10) || 0),
      0
    );
    setTotalPcs(total);
  };

  // ✅ Handle size range fill
  const handleRangeFill = () => {
    const value = parseInt(rangeInput, 10);
    if (isNaN(value) || value < 0) {
      setModal({
        title: 'Error',
        message: 'Please enter a valid number for the range.',
      });
      return;
    }

    const newSizeWiseEntry = {};
    sizes.forEach((size) => {
      newSizeWiseEntry[size] = value;
    });
    newSizeWiseEntry['extraPcs'] = sizeWiseEntry['extraPcs'] || '';

    setSizeWiseEntry(newSizeWiseEntry);

    const total = Object.entries(newSizeWiseEntry).reduce(
      (sum, [key, val]) => sum + (parseInt(val, 10) || 0),
      0
    );
    setTotalPcs(total);
  };

  // ✅ UPDATED Submit: Removed payment_type validation and submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !inwardNumber ||
      !cuttingMaster ||
      !selectedProduct ||
      !fabricType ||
      !weightOfFabric ||
      totalPcs <= 0
      // ✅ REMOVED: || !paymentType
    ) {
      setModal({
        title: 'Incomplete Form',
        message: 'Please fill all required fields properly.',
      });
      return;
    }

    try {
      const token = localStorage.getItem('branchToken');
      
      // Submit cutting entry (No payment_type)
      await axios.post(
        `${apiBaseUrl}/api/cutting-entry/add`,
        {
          inward_number: inwardNumber,
          cutting_master: cuttingMaster,
          product_name: selectedProduct,
          fabric_type: fabricType,
          weight_of_fabric: weightOfFabric,
          color: color, // ✅ NEW: Include color
          size_wise_entry: sizeWiseEntry,
          total_pcs: totalPcs,
          gross_amount: grossAmount,
          // ✅ REMOVED: payment_type: paymentType,
          branchId: branchId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setModal({
        title: 'Success!',
        message: 'Cutting entry successfully added! ✅',
      });
      
      // reset form
      setInwardNumber('');
      setFabricType('');
      setWeightOfFabric('');
      setColor(''); // ✅ NEW: Reset color
      setCuttingMaster('');
      setSelectedProduct('');
      setSizeWiseEntry({});
      setTotalPcs(0);
      setRangeInput('');
      setGrossAmount(0);
      // ✅ REMOVED: setPaymentType('');
    } catch (error) {
      console.error('Error submitting form:', error);
      setModal({
        title: 'Error',
        message: 'An error occurred while submitting the form.',
      });
    }
  };

  if (loading || !branchId) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p>Fetching data...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-5xl">
        <h2 className="text-2xl font-bold text-center text-[#0071bc] mb-6">
          Cutting Entry
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Inward Details Section */}
          <div className="bg-gray-50 p-6 rounded-xl border">
            <h3 className="font-bold mb-4 text-gray-700">Inward Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Inward Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fabric Inward Number
                </label>
                <input
                  type="text"
                  value={inwardNumber}
                  onChange={handleInwardNumberChange}
                  maxLength="10"
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-xl shadow-sm"
                  placeholder="Scan / write"
                  required
                />
              </div>
              {/* Fabric Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fabric Type
                </label>
                <input
                  type="text"
                  value={fabricType}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-xl bg-gray-100 cursor-not-allowed"
                  readOnly
                />
              </div>
              {/* ✅ NEW: Color Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Color
                </label>
                <input
                  type="text"
                  value={color}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-xl bg-gray-100 cursor-not-allowed"
                  readOnly
                />
              </div>
              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Weight of Fabric
                </label>
                <input
                  type="text"
                  value={weightOfFabric}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-xl bg-gray-100 cursor-not-allowed"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Cutting Details Section */}
          <div className="bg-gray-50 p-6 rounded-xl border">
            <h3 className="font-bold mb-4 text-gray-700">Cutting Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product & Staff Dropdowns */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select Product
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-xl shadow-sm"
                  required
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.product_name}>
                      {p.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cutting Master Name
                </label>
                <select
                  value={cuttingMaster}
                  onChange={(e) => setCuttingMaster(e.target.value)}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-xl shadow-sm"
                  required
                >
                  <option value="">-- Select Staff --</option>
                  {cuttingStaff.map((staff) => (
                    <option key={staff.id} value={staff.full_name}>
                      {staff.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Size Entry - Multi-column grid */}
            <div className="mt-6">
              <h3 className="font-bold mb-2">Size wise Entry (pcs)</h3>
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="number"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Enter value for all sizes"
                />
                <button
                  type="button"
                  onClick={handleRangeFill}
                  className="bg-gray-300 text-gray-800 p-2 rounded-lg hover:bg-gray-400"
                >
                  Fill All
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {sizes.map((size) => (
                  <div key={size}>
                    <label className="text-sm font-bold text-gray-500 block">{size}</label>
                    <input
                      type="number"
                      value={sizeWiseEntry[size] || ''}
                      onChange={(e) =>
                        handleSizeWiseEntryChange(size, e.target.value)
                      }
                      className="mt-1 w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="No."
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Extra Pcs */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Extra Pcs
                </label>
                <input
                  type="number"
                  value={sizeWiseEntry['extraPcs'] || ''}
                  onChange={(e) =>
                    handleSizeWiseEntryChange('extraPcs', e.target.value)
                  }
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-xl"
                  placeholder="Input No."
                />
              </div>
              {/* Total Pcs */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Pcs
                </label>
                <input
                  type="text"
                  value={totalPcs}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-xl bg-gray-100 cursor-not-allowed"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* ✅ UPDATED: Simplified Wage Section (Removed Payment Mode) */}
          <div className="bg-gray-50 p-6 rounded-xl border">
            <h3 className="font-bold mb-4 text-gray-700">Wage Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Gross Amount
                </label>
                <input
                  type="text"
                  value={grossAmount}
                  readOnly
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-xl bg-gray-100 cursor-not-allowed"
                />
              </div>
              {/* ✅ REMOVED: Payment Mode dropdown */}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl text-white font-bold text-lg bg-[#4b003a] hover:bg-[#6c0054]"
          >
            Submit
          </button>
        </form>
      </div>

      {/* Modal */}
      {modal.message && (
        <Modal
          title={modal.title}
          message={modal.message}
          onClose={() => setModal({ title: '', message: '' })}
        />
      )}
    </div>
  );
};

export default CuttingEntry;