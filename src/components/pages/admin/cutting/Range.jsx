import React, { useState, useEffect } from 'react';
import axios from 'axios';

// This component manages and displays a table of number ranges.
const RangePage = () => {
  // State for adding a new range
  const [isAdding, setIsAdding] = useState(false);
  // State for editing an existing range, holds the ID of the range being edited
  const [isEditing, setIsEditing] = useState(null);
  // State to store the list of ranges fetched from the backend
  const [ranges, setRanges] = useState([]);
  // State for the new range input fields
  const [newStartRange, setNewStartRange] = useState('');
  const [newEndRange, setNewEndRange] = useState('');
  // State for the edited range input fields
  const [editedStartRange, setEditedStartRange] = useState('');
  const [editedEndRange, setEditedEndRange] = useState('');
  // State to display messages to the user
  const [message, setMessage] = useState(null);
  // State for showing a loading indicator
  const [loading, setLoading] = useState(true);

  // Get the authentication token from local storage
  const token = localStorage.getItem("branchToken");

  // ✅ Axios instance with token
  const api = axios.create({
    baseURL: "http://localhost:5000/api/ranges",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Function to fetch all ranges from the backend
  const fetchRanges = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.get("/");
      const rangesWithSNo = response.data.map((range, index) => ({
        ...range,
        sNo: index + 1,
      }));
      setRanges(rangesWithSNo);
    } catch (error) {
      console.error("Error fetching ranges:", error);
      setMessage({ type: 'error', text: error.response?.data?.message || "Failed to fetch ranges." });
    } finally {
      setLoading(false);
    }
  };

  // Fetch ranges on component mount
  useEffect(() => {
    fetchRanges();
  }, []);

  // ✅ Function to handle adding a new range
  const handleAddRange = async (e) => {
    e.preventDefault();
    if (!newStartRange || !newEndRange) {
      setMessage({ type: 'error', text: 'Please enter both starting and ending ranges.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post("/add", {
        startRange: parseInt(newStartRange),
        endRange: parseInt(newEndRange)
      });
      setMessage({ type: 'success', text: response.data.message || "Range added successfully!" });
      setNewStartRange('');
      setNewEndRange('');
      setIsAdding(false);
      fetchRanges();
    } catch (error) {
      console.error("Error adding range:", error);
      setMessage({ type: 'error', text: error.response?.data?.message || "Failed to add range." });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Function to handle updating an existing range
  const handleUpdateRange = async (id) => {
    if (!editedStartRange || !editedEndRange) {
      setMessage({ type: 'error', text: 'Please enter both starting and ending ranges.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.put(`/${id}`, {
        startRange: parseInt(editedStartRange),
        endRange: parseInt(editedEndRange)
      });
      setMessage({ type: 'success', text: response.data.message || "Range updated successfully!" });
      setIsEditing(null);
      fetchRanges();
    } catch (error) {
      console.error("Error updating range:", error);
      setMessage({ type: 'error', text: error.response?.data?.message || "Failed to update range." });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Function to handle deleting a range
  const handleDeleteRange = async (id) => {
    const confirmation = window.confirm("Are you sure you want to delete this range?");
    if (confirmation) {
      setLoading(true);
      setMessage(null);
      try {
        const response = await api.delete(`/${id}`);
        setMessage({ type: 'success', text: response.data.message || "Range deleted successfully!" });
        fetchRanges();
      } catch (error) {
        console.error("Error deleting range:", error);
        setMessage({ type: 'error', text: error.response?.data?.message || "Failed to delete range." });
      } finally {
        setLoading(false);
      }
    }
  };

  // Function to set the state for editing
  const handleEditRange = (id, start, end) => {
    setIsEditing(id);
    setEditedStartRange(start);
    setEditedEndRange(end);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setIsEditing(null);
  };

  // Component for adding a new range
  const AddRangeForm = () => (
    <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50 text-gray-800">
      <h3 className="text-lg font-bold mb-2">Add New Range</h3>
      <form onSubmit={handleAddRange} className="space-y-2">
        <input
          type="number"
          placeholder="Starting Range"
          value={newStartRange}
          onChange={(e) => setNewStartRange(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
        <input
          type="number"
          placeholder="Ending Range"
          value={newEndRange}
          onChange={(e) => setNewEndRange(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
        <div className="flex gap-2">
          <button type="submit" className="bg-[#6a053c] text-white py-2 px-4 rounded">
            Save
          </button>
          <button type="button" onClick={handleCancel} className="bg-gray-500 text-white py-2 px-4 rounded">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  // Component for editing an existing range
  const EditRangeForm = ({ range }) => (
    <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50 text-gray-800">
      <h3 className="text-lg font-bold mb-2">Edit Range {range.sNo}</h3>
      <form onSubmit={(e) => { e.preventDefault(); handleUpdateRange(range.id); }} className="space-y-2">
        <input
          type="number"
          value={editedStartRange}
          onChange={(e) => setEditedStartRange(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
        <input
          type="number"
          value={editedEndRange}
          onChange={(e) => setEditedEndRange(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded">
            Update
          </button>
          <button type="button" onClick={handleCancel} className="bg-gray-500 text-white py-2 px-4 rounded">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-800 text-lg font-semibold">Loading ranges...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0071bc] p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Manage Ranges</h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setIsEditing(null);
          }}
          className="bg-[#6a053c] text-white font-bold py-2 px-6 rounded-full shadow-md hover:bg-[#5b0431] transition duration-200"
        >
          Add Range
        </button>
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {isAdding && <AddRangeForm />}
      {isEditing && <EditRangeForm range={ranges.find(r => r.id === isEditing)} />}

      <div className="overflow-x-auto mt-4">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-center border-b">S. No.</th>
              <th className="py-3 px-6 text-left border-b">Start Range</th>
              <th className="py-3 px-6 text-left border-b">End Range</th>
              <th className="py-3 px-6 text-center border-b">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {ranges.map((range, index) => (
              <tr key={range.id || index} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-6 text-center whitespace-nowrap border-r">{range.sNo}</td>
                <td className="py-3 px-6 text-left border-r">{range.startRange}</td>
                <td className="py-3 px-6 text-left border-r">{range.endRange}</td>
                <td className="py-3 px-6 text-center flex items-center justify-center space-x-2">
                  <button onClick={() => handleEditRange(range.id, range.startRange, range.endRange)} className="text-blue-500 hover:text-blue-700">
                    <span role="img" aria-label="edit">✏️</span>
                  </button>
                  <button onClick={() => handleDeleteRange(range.id)} className="text-red-500 hover:text-red-700">
                    <span role="img" aria-label="delete">🗑️</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RangePage;
