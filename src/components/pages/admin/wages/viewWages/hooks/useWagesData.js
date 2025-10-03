import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const useWagesData = () => {
  const [operations, setOperations] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  const [wageData, setWageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingBalances, setPendingBalances] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const { branchId } = useParams();

  // 🔥 FIX: Get stored token and branchId
  const getAuthData = () => {
    const token = localStorage.getItem("branchToken");
    const storedBranchId = branchId || 
                           localStorage.getItem("branchId") || 
                           localStorage.getItem("branch_id") || 
                           "1";
    return { token, branchId: storedBranchId };
  };

  // 🔥 MAIN FIX: Advance balance fetching
  const fetchAdvanceBalances = useCallback(async () => {
    const { token, branchId: currentBranchId } = getAuthData();
    
    if (!token || !currentBranchId) {
      console.warn("⚠️ No token or branchId found");
      return {};
    }

    try {
      console.log("🔄 FETCHING ADVANCE BALANCES...", { 
        apiUrl: `${apiBaseUrl}/api/advance-payments/pending`,
        branchId: currentBranchId 
      });

      // 🔥 FIX: Use /pending endpoint for unpaid advances
      const response = await axios.get(`${apiBaseUrl}/api/advance-payments/pending`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { branch_id: currentBranchId },
        timeout: 15000
      });

      console.log("📊 RAW RESPONSE:", response.data);

      let advancePayments = [];
      
      // Handle response format
      if (response.data.success && Array.isArray(response.data.advance_payments)) {
        advancePayments = response.data.advance_payments;
      } else if (Array.isArray(response.data)) {
        advancePayments = response.data;
      }

      console.log("💰 ADVANCE PAYMENTS FOUND:", advancePayments.length);

      // Calculate balances per staff
      const balances = {};
      
      advancePayments.forEach(payment => {
        if (payment.staff_name) {
          const staffName = payment.staff_name;
          const amount = parseFloat(payment.amount) || 0;
          
          // Sum multiple unpaid advances for same staff
          balances[staffName] = (balances[staffName] || 0) + amount;
          
          console.log(`💵 ${staffName}: +₹${amount} = ₹${balances[staffName]}`);
        }
      });

      console.log("✅ FINAL BALANCES:", balances);
      
      setPendingBalances(balances);
      return balances;

    } catch (err) {
      console.error("❌ Error fetching advance balances:", err);
      if (err.response) {
        console.error("Response error:", {
          status: err.response.status,
          data: err.response.data
        });
      }
      setPendingBalances({});
      return {};
    }
  }, [branchId]);

  // Fetch operations
  useEffect(() => {
    const fetchOperations = async () => {
      const { token, branchId: currentBranchId } = getAuthData();
      
      if (!token || !currentBranchId) {
        setLoading(false);
        setError("Authentication token or Branch ID missing.");
        return;
      }

      try {
        console.log("🔄 Fetching operations...");
        
        const res = await axios.get(`${apiBaseUrl}/api/operations`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { branch_id: currentBranchId },
        });
        
        const fetchedOperations = res.data.filter(
          (op) => op.name.toLowerCase() !== "cutting"
        );
        
        console.log("✅ Operations fetched:", fetchedOperations.map(op => op.name));
        
        setOperations(fetchedOperations);
        if (fetchedOperations.length > 0) {
          setActiveTab(fetchedOperations[0].name.toLowerCase());
        }
      } catch (err) {
        console.error("❌ Error fetching operations:", err);
        setError("Failed to fetch operations.");
        setLoading(false);
      }
    };
    fetchOperations();
  }, [branchId]);

  // Fetch wages and balances
  useEffect(() => {
    if (!activeTab) return;

    const fetchWagesAndBalances = async () => {
      const { token, branchId: currentBranchId } = getAuthData();
      
      if (!token || !currentBranchId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setWageData([]);

      const headers = { Authorization: `Bearer ${token}` };

      try {
        console.log(`🔄 Fetching ${activeTab} wages...`);
        
        let operationToFetch = activeTab;
        if (activeTab === "flatlock" || activeTab === "overlock") {
          operationToFetch = "singer";
        }
        
        const wageRes = await axios.get(`${apiBaseUrl}/api/wages/by-operation`, {
          headers,
          params: { 
            branch_id: currentBranchId, 
            operation: operationToFetch,
            _t: Date.now()
          }
        });
        
        const jobsData = wageRes.data.data || wageRes.data;
        let cleanData = Array.isArray(jobsData) ? jobsData : [];
        
        // Filter based on operation
        let fetchedWages = [];
        if (activeTab === "flatlock") {
          fetchedWages = cleanData.filter(
            job => job.flatlock_operator && job.flatlock_operator.trim() !== ""
          );
        } else if (activeTab === "overlock") {
          fetchedWages = cleanData.filter(
            job => job.overlock_operator && job.overlock_operator.trim() !== ""
          );
        } else {
          fetchedWages = cleanData.filter(
            job => job.staff_name && job.staff_name.trim() !== ""
          );
        }

        console.log(`✅ ${activeTab} wages fetched:`, fetchedWages.length);
        setWageData(fetchedWages);

        // Fetch advance balances
        console.log("🔄 Now fetching advance balances...");
        await fetchAdvanceBalances();

      } catch (err) {
        console.error("❌ Error fetching data:", err);
        setError("Failed to fetch data for this operation.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchWagesAndBalances();
  }, [activeTab, branchId, fetchAdvanceBalances]);

  // Refresh function
  const refreshWagesData = useCallback(async () => {
    const { token, branchId: currentBranchId } = getAuthData();
    
    if (!token || !currentBranchId) {
      console.error("❌ Cannot refresh: Missing auth data");
      return;
    }

    setRefreshing(true);
    setError(null);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      console.log("🔄 REFRESHING ALL DATA...");

      let operationToFetch = activeTab;
      if (activeTab === "flatlock" || activeTab === "overlock") {
        operationToFetch = "singer";
      }

      const wageRes = await axios.get(`${apiBaseUrl}/api/wages/by-operation`, {
        headers,
        params: { 
          branch_id: currentBranchId, 
          operation: operationToFetch,
          _t: Date.now()
        }
      });
      
      const rawData = wageRes.data.data || wageRes.data;
      const dataToCache = Array.isArray(rawData) ? rawData : [];
      
      let fetchedWages = [];
      if (activeTab === "flatlock") {
        fetchedWages = dataToCache.filter(
          job => job.flatlock_operator && job.flatlock_operator.trim() !== ""
        );
      } else if (activeTab === "overlock") {
        fetchedWages = dataToCache.filter(
          job => job.overlock_operator && job.overlock_operator.trim() !== ""
        );
      } else {
        fetchedWages = dataToCache.filter(
          job => job.staff_name && job.staff_name.trim() !== ""
        );
      }

      setWageData(fetchedWages);

      // Refresh advance balances
      const freshBalances = await fetchAdvanceBalances();

      console.log("✅ REFRESH COMPLETE:", {
        wages: fetchedWages.length,
        balances: Object.keys(freshBalances).length
      });

    } catch (err) {
      console.error("❌ Error refreshing data:", err);
      setError("Failed to refresh data.");
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, branchId, fetchAdvanceBalances]);

  // Quick advance refresh
  const refreshAdvanceBalances = useCallback(async () => {
    try {
      console.log("🔄 QUICK REFRESH: Advance Balances");
      const newBalances = await fetchAdvanceBalances();
      console.log("✅ Balances refreshed:", newBalances);
      return newBalances;
    } catch (err) {
      console.error("❌ Error refreshing balances:", err);
      return {};
    }
  }, [fetchAdvanceBalances]);

  return {
    operations,
    activeTab,
    setActiveTab,
    wageData,
    loading,
    refreshing,
    error,
    pendingBalances,
    refreshWagesData,
    refreshAdvanceBalances,
    fetchAdvanceBalances,
    clearError: () => setError(null)
  };
};

export default useWagesData;