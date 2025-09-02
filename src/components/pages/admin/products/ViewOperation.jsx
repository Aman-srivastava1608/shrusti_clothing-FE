import React, { useState, useEffect } from 'react';
import axios from 'axios';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const OperationsTable = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [operations, setOperations] = useState([]);
  const [newOperationName, setNewOperationName] = useState('');
  const [editedOperationName, setEditedOperationName] = useState('');
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("branchToken");

  // ✅ Axios instance with token
  const api = axios.create({
    baseURL: `${apiBaseUrl}/api/operations`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Backend se operations fetch karne ka function
  const fetchOperations = async () => {
    setLoading(true);
    try {
      const response = await api.get("/");
      const operationsWithSNo = response.data.map((op, index) => ({
        ...op,
        sNo: index + 1,
      }));
      setOperations(operationsWithSNo);
    } catch (error) {
      console.error("Error fetching operations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, []);

  // ✅ Naya operation add
  const handleAddOperation = async (e) => {
    e.preventDefault();
    if (!newOperationName) {
      alert("Operation name is required!");
      return;
    }
    try {
      await api.post("/add", { name: newOperationName });
      alert("Operation added successfully!");
      setNewOperationName("");
      setIsAdding(false);
      fetchOperations();
    } catch (error) {
      console.error("Error adding operation:", error);
      alert(error.response?.data?.message || "Failed to add operation.");
    }
  };

  // ✅ Operation update
  const handleUpdateOperation = async (id) => {
    try {
      await api.put(`/${id}`, { name: editedOperationName });
      alert("Operation updated successfully!");
      setIsEditing(null);
      fetchOperations();
    } catch (error) {
      console.error("Error updating operation:", error);
      alert(error.response?.data?.message || "Failed to update operation.");
    }
  };

  // ✅ Operation delete
  const handleDeleteOperation = async (id) => {
    if (window.confirm("Are you sure you want to delete this operation?")) {
      try {
        await api.delete(`/${id}`);
        alert("Operation deleted successfully!");
        fetchOperations();
      } catch (error) {
        console.error("Error deleting operation:", error);
        alert(error.response?.data?.message || "Failed to delete operation.");
      }
    }
  };

  const handleEditOperation = (id, name) => {
    setIsEditing(id);
    setEditedOperationName(name);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setIsEditing(null);
  };

  // ✅ Add operation form
  const AddOperationForm = () => (
    <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50 text-gray-800">
      <h3 className="text-lg font-bold mb-2">Add New Operation</h3>
      <form onSubmit={handleAddOperation}>
        <input
          type="text"
          placeholder="Operation Name"
          value={newOperationName}
          onChange={(e) => setNewOperationName(e.target.value)}
          className="border p-2 rounded w-full mb-2"
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

  // ✅ Edit operation form
  const EditOperationForm = ({ op }) => (
    <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50 text-gray-800">
      <h3 className="text-lg font-bold mb-2">Edit Operation {op.sNo}</h3>
      <form onSubmit={(e) => { e.preventDefault(); handleUpdateOperation(op.id); }}>
        <input
          type="text"
          value={editedOperationName}
          onChange={(e) => setEditedOperationName(e.target.value)}
          className="border p-2 rounded w-full mb-2"
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
        <div className="text-gray-800 text-lg font-semibold">Loading operations...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0071bc] p-6 rounded-lg shadow-lg">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setIsAdding(true);
            setIsEditing(null);
          }}
          className="bg-[#6a053c] text-white font-bold py-2 px-6 rounded-full shadow-md hover:bg-[#6a053c] transition duration-200"
        >
          Add Operation
        </button>
      </div>

      {isAdding && <AddOperationForm />}
      {isEditing && <EditOperationForm op={operations.find(op => op.id === isEditing)} />}

      <div className="overflow-x-auto mt-4">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-center border-b">S. No.</th>
              <th className="py-3 px-6 text-left border-b">Operation Name</th>
              <th className="py-3 px-6 text-center border-b">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {operations.map((op, index) => (
              <tr key={op.id || index} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-6 text-center whitespace-nowrap border-r">{op.sNo}</td>
                <td className="py-3 px-6 text-left border-r">{op.name}</td>
                <td className="py-3 px-6 text-center flex items-center justify-center space-x-2">
                  <button onClick={() => handleEditOperation(op.id, op.name)} className="text-blue-500 hover:text-blue-700">
                    <span role="img" aria-label="edit">✏️</span>
                  </button>
                  <button onClick={() => handleDeleteOperation(op.id)} className="text-red-500 hover:text-red-700">
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

export default OperationsTable;
