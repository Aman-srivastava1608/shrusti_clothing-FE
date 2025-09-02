import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export default function BranchLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
    
      const res = await axios.post(`${apiBaseUrl}/api/branch/login`, {
        email,
        password,
      });
      localStorage.setItem("branchToken", res.data.token);
      navigate(`/admin/${res.data.branch_id}/dashboard`);
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 via-blue-200 to-blue-300">
      <div className="bg-white p-10 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-4xl font-extrabold text-center text-blue-700 mb-6">
          Branch Login
        </h2>

        <form onSubmit={handleSubmit}>
          <label className="block mb-2 font-semibold text-gray-700">Email</label>
          <input
            type="email"
            placeholder="branch@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />

          <label className="block mb-2 font-semibold text-gray-700">Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 mb-6 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-300"
          >
            Login
          </button>
        </form>  
      </div>
    </div>
  );
}
