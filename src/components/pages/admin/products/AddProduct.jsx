import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// A simple reusable Modal component to replace alert/confirm
const Modal = ({ title, message, onConfirm, onCancel, showConfirm = false, onClose }) => {
    if (!message) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-gray-800">
                <h3 className="text-xl font-bold mb-4">{title}</h3>
                <p className="mb-6">{message}</p>
                <div className="flex justify-end space-x-2">
                    {showConfirm && (
                        <button
                            onClick={onConfirm}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
                        >
                            OK
                        </button>
                    )}
                    <button
                        onClick={onCancel || onClose}
                        className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const AddProductForm = () => {
    const [productName, setProductName] = useState('');
    const [fabricType, setFabricType] = useState('');
    const [operations, setOperations] = useState([]);
    const [fabricTypes, setFabricTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    // State for modal messages
    const [modal, setModal] = useState({ title: '', message: '', showConfirm: false, onConfirm: null });

    const { branchId } = useParams();
    const navigate = useNavigate();

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('branchToken'); 

            if (!token) {
                setModal({
                    title: 'Login Required',
                    message: 'You must be logged in.',
                    onClose: () => navigate('/login')
                });
                return;
            }

            const config = {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };
    
            // Fetch operations from the backend
            const operationsResponse = await axios.get(
                `${apiBaseUrl}/api/operations?branchId=${branchId}`, 
                config
            );
            const operationsWithRates = operationsResponse.data.map(op => ({
                ...op,
                rate: ''
            }));
            setOperations(operationsWithRates);
    
            // ❗ Corrected: Fetch fabric types with branchId
            const fabricTypesResponse = await axios.get(
                `${apiBaseUrl}/api/receipts/fabric-types?branchId=${branchId}`,
                config
            );
            setFabricTypes(fabricTypesResponse.data);
    
        } catch (error) {
            console.error('Error fetching data:', error);
            setModal({
                title: 'Error',
                message: 'An error occurred while fetching data. Please check the backend server and token.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (branchId) {
            fetchAllData();
        }
    }, [branchId]);

    const handleOperationChange = (index, e) => {
        const { value } = e.target;
        const newOperations = [...operations];
        newOperations[index].rate = value;
        setOperations(newOperations);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        if (!productName || !fabricType || operations.some(op => !op.rate)) {
            setModal({
                title: 'Incomplete Form',
                message: 'Please fill in all fields.'
            });
            return;
        }

        const token = localStorage.getItem('branchToken');
        if (!token) {
            setModal({
                title: 'Login Required',
                message: 'Login is required to add a product.',
                onClose: () => navigate('/login')
            });
            return;
        }

        const config = {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        try {
            await axios.post(
                `${apiBaseUrl}/api/products/add`, 
                {
                    product_name: productName,
                    fabric_type: fabricType,
                    operations: operations.map(op => ({ name: op.name, rate: op.rate })),
                    branch_id: branchId 
                }, 
                config
            );

            setModal({
                title: 'Success!',
                message: 'Product has been successfully added!',
                onClose: () => {
                    setProductName('');
                    setFabricType('');
                    setOperations(operations.map(op => ({ ...op, rate: '' })));
                    setModal({ title: '', message: '' });
                }
            });
        } catch (error) {
            console.error('Error submitting form:', error);
            setModal({
                title: 'Error',
                message: 'The form could not be submitted. Please try again.'
            });
        }
    };
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p>Loading operations...</p>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100 p-4">
            <div className="bg-[#0071bc] text-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="productName" className="block text-lg font-medium mb-1">
                            Product Name
                        </label>
                        <input
                            type="text"
                            id="productName"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            className="w-full p-3 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Enter a name"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="fabricType" className="block text-lg font-medium mb-1">
                            Select Fabric Type
                        </label>
                        <select
                            id="fabricType"
                            value={fabricType}
                            onChange={(e) => setFabricType(e.target.value)}
                            className="w-full p-3 rounded-xl bg-white text-black appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        >
                            <option value="" disabled hidden>
                                Dropdown
                            </option>
                            {fabricTypes.map(ft => (
                                <option key={ft.id} value={ft.fabric_type_name}>
                                    {ft.fabric_type_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium mb-2">Enter Product Operations and Rates</h3>
                        <div className="space-y-4">
                            {operations.map((op, index) => (
                                <div key={op.id || index} className="flex space-x-4 items-center">
                                    <input
                                        type="text"
                                        name="name"
                                        value={op.name}
                                        className="w-1/2 p-3 rounded-xl bg-white text-black text-center focus:outline-none cursor-not-allowed"
                                        readOnly
                                    />
                                    <input
                                        type="number"
                                        name="rate"
                                        value={op.rate || ''}
                                        onChange={(e) => handleOperationChange(index, e)}
                                        className="w-1/2 p-3 rounded-xl bg-white text-black text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Rate (RS.)"
                                        required
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full py-3 px-6 rounded-xl bg-[#4b003a] text-white font-bold text-lg hover:bg-[#6c0054] transition-colors"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            </div>
            <Modal
                title={modal.title}
                message={modal.message}
                onClose={() => setModal({ title: '', message: '' })}
                onConfirm={modal.onConfirm}
                showConfirm={modal.showConfirm}
            />
        </div>
    );
};

export default AddProductForm;
