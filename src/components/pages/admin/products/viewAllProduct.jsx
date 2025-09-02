import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// A simple reusable Modal component
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
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Safe operations parser
const parseOperations = (ops) => {
  try {
    if (!ops) return [];
    if (typeof ops === "string") {
      const parsed = JSON.parse(ops);
      return Array.isArray(parsed) ? parsed : [];
    }
    return Array.isArray(ops) ? ops : [];
  } catch {
    return [];
  }
};

// Edit Product Modal Component
const EditProductModal = ({ product, onClose, onUpdate }) => {
  const [editedProductName, setEditedProductName] = useState(product.product_name);
  const [editedFabricType] = useState(product.fabric_type);
  const [editedOperations, setEditedOperations] = useState(parseOperations(product.operations));
  const [modal, setModal] = useState({ title: '', message: '' });

  const handleOperationChange = (index, e) => {
    const { value } = e.target;
    const newOperations = [...editedOperations];
    newOperations[index].rate = value;
    setEditedOperations(newOperations);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!editedProductName || editedOperations.some(op => op.rate === '' || op.rate === null)) {
      setModal({ title: 'Error', message: 'Please fill in all fields.' });
      return;
    }
    onUpdate({
      ...product,
      product_name: editedProductName,
      fabric_type: editedFabricType,
      operations: editedOperations,
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4 z-40">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg text-black">
        <h2 className="text-xl font-bold mb-4">Edit Product: {product.product_name}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Product Name</label>
            <input
              type="text"
              value={editedProductName}
              onChange={(e) => setEditedProductName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Fabric Type</label>
            <input
              type="text"
              value={editedFabricType}
              readOnly
              className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-md font-semibold">Operations & Rates</h3>
            {editedOperations.map((op, index) => (
              <div key={index} className="flex items-center space-x-2">
                <label className="w-1/2 text-sm font-medium">{op.name}</label>
                <input
                  type="number"
                  value={op.rate}
                  onChange={(e) => handleOperationChange(index, e)}
                  className="w-1/2 p-2 border rounded"
                  placeholder="Rate (RS.)"
                  required
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 text-gray-800 py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white py-2 px-4 rounded"
            >
              Update
            </button>
          </div>
        </form>
      </div>
      <Modal 
        title={modal.title} 
        message={modal.message} 
        onClose={() => setModal({ title: '', message: '' })} 
      />
    </div>
  );
};

const ViewAllProductsTable = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [fabricSearch, setFabricSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [modal, setModal] = useState({ title: '', message: '' });

  const { branchId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('branchToken');

  const api = axios.create({
    baseURL: `${apiBaseUrl}/api/products`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      if (!branchId) {
        setModal({ title: 'Error', message: 'Branch ID is missing from the URL. Please navigate from the dashboard.' });
        return;
      }
      const response = await api.get(`/`, { params: { branch_id: branchId } });
      const productsWithSNo = response.data.map((p, index) => ({
        ...p,
        operations: parseOperations(p.operations),
        sNo: index + 1
      }));
      setProducts(productsWithSNo);
    } catch (error) {
      console.error('Error fetching products:', error);
      setModal({ title: 'Error', message: 'Failed to fetch products. Please check your network and try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setModal({ 
        title: 'Login Required', 
        message: 'You must be logged in to view this page.',
        onClose: () => navigate('/login')
      });
      return;
    }
    fetchProducts();
  }, [token, branchId]);

  const handleEditProduct = (product) => {
    setEditingProduct(product);
  };

  const handleUpdateProduct = async (updatedProduct) => {
    try {
      await api.put(`/${updatedProduct.id}`, {
        product_name: updatedProduct.product_name,
        fabric_type: updatedProduct.fabric_type,
        operations: updatedProduct.operations,
        branch_id: branchId,
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.id === updatedProduct.id
            ? {
                ...p,
                product_name: updatedProduct.product_name,
                operations: updatedProduct.operations,
              }
            : p
        )
      );

      setModal({ title: 'Success', message: 'Product updated successfully!' });
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      setModal({ title: 'Error', message: 'Failed to update product.' });
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await api.delete(`/${id}`, { params: { branch_id: branchId } });
        setProducts(products.filter((p) => p.id !== id));
        setModal({ title: 'Success', message: 'Product deleted successfully!' });
      } catch (error) {
        console.error('Error deleting product:', error);
        setModal({ title: 'Error', message: 'Failed to delete product.' });
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesProductName = product.product_name.toLowerCase().includes(productSearch.toLowerCase());
    const matchesFabricType = product.fabric_type.toLowerCase().includes(fabricSearch.toLowerCase());
    return matchesProductName && matchesFabricType;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-800 text-lg font-semibold">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-100 p-8">
      <div className="bg-[#0071bc] p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">View All Product</h2>
        </div>

        <div className="flex space-x-4 mb-4">
          <input
            type="text"
            placeholder="Search Product Name..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-1/2 p-2 border border-gray-300 rounded-md text-black bg-white"
          />
          <input
            type="text"
            placeholder="Search Fabric Type..."
            value={fabricSearch}
            onChange={(e) => setFabricSearch(e.target.value)}
            className="w-1/2 p-2 border border-gray-300 rounded-md text-black bg-white"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-center border-b">S. No.</th>
                <th className="py-3 px-6 text-left border-b">Product Name</th>
                <th className="py-3 px-6 text-left border-b">Fabric Type</th>
                <th className="py-3 px-6 text-center border-b">Operations & Rates</th>
                <th className="py-3 px-6 text-center border-b">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {filteredProducts.map((product, index) => (
                <tr key={product.id || index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-6 text-center border-r">{product.sNo}</td>
                  <td className="py-3 px-6 text-left border-r">{product.product_name}</td>
                  <td className="py-3 px-6 text-left border-r">{product.fabric_type}</td>
                  <td className="py-3 px-6 text-left border-r">
                    {parseOperations(product.operations).map((op, opIndex) => (
                      <div key={opIndex}>{op.name}: {op.rate}</div>
                    ))}
                  </td>
                  <td className="py-3 px-6 text-center flex items-center justify-center space-x-2">
                    <button onClick={() => handleEditProduct(product)} className="text-blue-500 hover:text-blue-700">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="text-red-500 hover:text-red-700">
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-gray-500">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingProduct && (
        <EditProductModal
          product={editingProduct} 
          onClose={() => setEditingProduct(null)}
          onUpdate={handleUpdateProduct}
        />
      )}
    <Modal
      title={modal.title}
      message={modal.message}
      onClose={() => setModal({ title: '', message: '' })}
    />
    </div>
  );
};
  
export default ViewAllProductsTable;