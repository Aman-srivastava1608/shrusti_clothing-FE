import React, { useState, useEffect } from "react";
import axios from "axios";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Helper function to format date to DD/MM/YYYY
const getTodayDateDDMMYYYY = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
};

// The main application component
const App = () => {
    return (
        <div className="bg-gray-100 min-h-screen p-4 flex items-center justify-center">
            <AdvancePayment />
        </div>
    );
};

// The AdvancePayment form component
const AdvancePayment = () => {
    // Initial state for the form data
    const initialFormState = {
        staffId: "",
        staffName: "",
        aadharNumber: "",
        panNumber: "",
        mobileNumber: "",
        amount: "",
        paymentMethod: "",
        paymentDate: getTodayDateDDMMYYYY() // Auto-fill with today's date
    };

    // State variables
    const [formData, setFormData] = useState(initialFormState);
    const [staffList, setStaffList] = useState([]);
    const [filteredStaff, setFilteredStaff] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    // Hardcoded payment methods
    const paymentMethods = ["UPI", "Cash", "Cheque", "Bank Transfer"];

    // Effect to fetch all staff members on component mount
    useEffect(() => {
        const fetchStaffList = async () => {
            try {
                const res = await axios.get(`${apiBaseUrl}/api/staff/`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("branchToken")}`
                    },
                });
                setStaffList(res.data);
                setFilteredStaff(res.data);
            } catch (err) {
                console.error("Error fetching staff list:", err);
                setMessage("Error fetching staff list. Please check your backend.");
                setIsError(true);
            }
        };
        fetchStaffList();
    }, []);

    // Handle changes to the staff name input for filtering
    const handleStaffNameChange = (e) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, staffName: value }));

        if (value.trim() === "") {
            setFilteredStaff(staffList);
            setShowDropdown(false);
            // Clear other fields when staff name is cleared
            setFormData(prev => ({
                ...prev,
                staffId: "",
                aadharNumber: "",
                panNumber: "",
                mobileNumber: ""
            }));
        } else {
            const filtered = staffList.filter(staff =>
                staff.full_name.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredStaff(filtered);
            setShowDropdown(true);
        }
    };

    // Handle selecting a staff member from the dropdown
    const handleStaffSelect = (staff) => {
        setFormData(prev => ({
            ...prev,
            staffId: staff.id,
            staffName: staff.full_name,
            aadharNumber: staff.aadhar_number || "",
            panNumber: staff.pan_number || "",
            mobileNumber: staff.mobile_number || ""
        }));
        setShowDropdown(false);
    };

    // Handle changes for other form fields
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(""); // Clear previous messages
        setIsError(false);
        
        // Convert DD/MM/YYYY to YYYY-MM-DD for backend
        const [day, month, year] = formData.paymentDate.split('/');
        const formattedDate = `${year}-${month}-${day}`;

        try {
            await axios.post(`${apiBaseUrl}/api/advance-payment/add`, {
                ...formData,
                paymentDate: formattedDate,
            }, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("branchToken")}`,
                },
            });

            setMessage("Advance payment recorded successfully!");
            setIsError(false);
            setFormData(initialFormState); // Reset form
            setShowDropdown(false);
        } catch (err) {
            console.error("Error:", err);
            const errorMessage = err.response?.data?.error || "Failed to record advance payment";
            setMessage(errorMessage);
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl lg:max-w-3xl mx-auto">
            <div className="bg-black text-white p-4 rounded-2xl shadow-lg">
                <h2 className="text-center bg-blue-600 text-white py-2 px-4 rounded-xl mb-4 text-lg font-semibold">
                    Advance Payment
                </h2>

                {/* Message box for success or error */}
                {message && (
                    <div className={`p-4 rounded-xl mb-4 text-center font-medium ${isError ? "bg-red-500" : "bg-green-500"}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Staff Name with Search/Dropdown */}
                    <div className="relative">
                        <label htmlFor="staffName" className="block text-white font-medium mb-2">Staff name</label>
                        <input
                            type="text"
                            id="staffName"
                            name="staffName"
                            value={formData.staffName}
                            onChange={handleStaffNameChange}
                            onFocus={() => setShowDropdown(true)}
                            placeholder="Search or select staff"
                            className="w-full p-2 rounded-lg bg-gray-200 text-gray-800 placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        {/* Dropdown list */}
                        {showDropdown && filteredStaff.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg max-h-48 overflow-y-auto shadow-lg">
                                {filteredStaff.map((staff) => (
                                    <div
                                        key={staff.id}
                                        onClick={() => handleStaffSelect(staff)}
                                        className="p-3 hover:bg-gray-100 cursor-pointer text-gray-800 border-b border-gray-100 last:border-b-0"
                                    >
                                        {staff.full_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* New row for three fields */}
                    <div className="flex flex-col md:flex-row md:space-x-4">
                        {/* Mobile Number */}
                        <div className="w-full md:w-1/3">
                            <label htmlFor="mobileNumber" className="block text-white font-medium mb-2">Mobile Number</label>
                            <input
                                type="tel"
                                id="mobileNumber"
                                name="mobileNumber"
                                value={formData.mobileNumber}
                                onChange={handleChange}
                                placeholder="Autofill"
                                className="w-full p-2 rounded-lg bg-gray-200 text-gray-800 placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                maxLength="10"
                                pattern="[0-9]{10}"
                                readOnly={!!formData.staffId}
                            />
                        </div>

                        {/* Aadhar Number */}
                        <div className="w-full md:w-1/3">
                            <label htmlFor="aadharNumber" className="block text-white font-medium mb-2">Aadhar number</label>
                            <input
                                type="text"
                                id="aadharNumber"
                                name="aadharNumber"
                                value={formData.aadharNumber}
                                onChange={handleChange}
                                placeholder="Autofill"
                                className="w-full p-2 rounded-lg bg-gray-200 text-gray-800 placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                readOnly={!!formData.staffId}
                            />
                        </div>

                        {/* Pan Number */}
                        <div className="w-full md:w-1/3">
                            <label htmlFor="panNumber" className="block text-white font-medium mb-2">Pan number</label>
                            <input
                                type="text"
                                id="panNumber"
                                name="panNumber"
                                value={formData.panNumber}
                                onChange={handleChange}
                                placeholder="Autofill"
                                className="w-full p-2 rounded-lg bg-gray-200 text-gray-800 placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                readOnly={!!formData.staffId}
                            />
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label htmlFor="amount" className="block text-white font-medium mb-2">Amount (Rs.)</label>
                        <input
                            type="number"
                            id="amount"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            placeholder="Input Number"
                            className="w-full p-2 rounded-lg bg-gray-200 text-gray-800 placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label htmlFor="paymentMethod" className="block text-white font-medium mb-2">Payment method</label>
                        <select
                            id="paymentMethod"
                            name="paymentMethod"
                            value={formData.paymentMethod}
                            onChange={handleChange}
                            className="w-full p-2 rounded-lg bg-gray-200 text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Dropdown (UPI/Cash/Cheque/Bank transfer)</option>
                            {paymentMethods.map((method) => (
                                <option key={method} value={method}>
                                    {method}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Date */}
                    <div>
                        <label htmlFor="paymentDate" className="block text-white font-medium mb-2">Payment Date</label>
                        <input
                            type="text"
                            id="paymentDate"
                            name="paymentDate"
                            value={formData.paymentDate}
                            onChange={handleChange}
                            className="w-full p-2 rounded-lg bg-gray-200 text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-yellow-500 text-black font-bold py-2 px-4 rounded-xl hover:bg-yellow-600 transition duration-200 disabled:opacity-50"
                    >
                        {loading ? "Submitting..." : "Submit"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default App;