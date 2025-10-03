import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// TOKEN + BRANCH_ID: Fixed Payment submit function


// ===================== Handle Payment Submit =====================
export const handlePaymentSubmit = async (paymentData, activeTab) => {
  try {
    const token =
      localStorage.getItem("branchToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken");

    // 🔥 FIX: Get branch_id from multiple sources
    let branchId =
      localStorage.getItem("branchId") ||
      localStorage.getItem("branch_id") ||
      localStorage.getItem("selectedBranch") ||
      localStorage.getItem("currentBranch");

    if (!token) {
      alert("No authentication token found! Please refresh page and login again.");
      return { success: false, message: "No authentication token found. Please login again." };
    }

    // 🔥 PRODUCTION FIX: If no branchId, try to get from API or use default
    if (!branchId) {
      try {
        const userResponse = await axios.get(`${apiBaseUrl}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (userResponse.data?.branch_id) {
          branchId = userResponse.data.branch_id;
          localStorage.setItem("branchId", branchId);
        } else if (userResponse.data?.branches?.length > 0) {
          branchId = userResponse.data.branches[0].id;
          localStorage.setItem("branchId", branchId);
        } else {
          console.warn("No branch found, using default branch ID: 1");
          branchId = "1";
          localStorage.setItem("branchId", branchId);
        }
      } catch (error) {
        console.error("Error fetching branch info:", error);
        branchId = "1";
        localStorage.setItem("branchId", branchId);
      }
    }

    // Prepare job IDs
    const jobIds = paymentData.jobs.map((job) => job.id);

    // Staff ID fetch if missing
    let staffId = paymentData.staffId;
    if (!staffId) {
      staffId = await getStaffId(paymentData.operator, activeTab, token, branchId);
    }

    // ===================== Payment Payload =====================
    const paymentPayload = {
      staff_name: paymentData.operator,
      staff_id: staffId,
      branch_id: parseInt(branchId),

      gross_amount: parseFloat(paymentData.grossAmount),
      deduction: parseFloat(paymentData.deduction || 0),

      // ✅ Editable payable amount
      payable_amount: parseFloat(paymentData.payableAmount),

      payment_type: paymentData.paymentType || "Cash",
      job_ids: jobIds,
      jobs_count: paymentData.jobs.length,
      total_pieces: paymentData.jobs.reduce(
        (sum, job) => sum + (job.total_pieces || job.total_pcs || 0),
        0
      ),

      // ✅ Advance Payment fields
      advance_amount_paid: parseFloat(paymentData.advanceDeduction || 0),
      advance_payment_id: paymentData.advance_payment_id || null,
      advance_transaction_type: paymentData.advanceTransactionType || "withdraw", // NEW
    };

    console.log("🔥 Payment Payload:", paymentPayload);

    // ===================== API Endpoint =====================
    let endpoint = "";
    switch (activeTab) {
      case "singer":
        endpoint = "/api/wages/submit-singer-payment";
        break;
      case "flatlock":
        endpoint = "/api/wages/submit-flatlock-payment";
        break;
      case "overlock":
        endpoint = "/api/wages/submit-overlock-payment";
        break;
      default:
        endpoint = "/api/wages/submit-payment";
    }

    const response = await axios.post(
      `${apiBaseUrl}${endpoint}`,
      paymentPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || `${activeTab.toUpperCase()} payment successful!`,
        paymentId: response.data.paymentId,
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Payment failed.",
      };
    }
  } catch (error) {
    console.error("Payment error:", error);
    return {
      success: false,
      message: error.response?.data?.error || "Error processing payment.",
    };
  }
};

// ===================== Get Staff ID Helper =====================
const getStaffId = async (operatorName, activeTab, token, branchId) => {
  try {
    const res = await axios.get(`${apiBaseUrl}/api/staff/by-name`, {
      params: { name: operatorName, branchId, operation: activeTab },
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.data?.staffId || null;
  } catch (err) {
    console.error("Error fetching staff ID:", err);
    return null;
  }
};

// 🔥 FIX: Updated fetchStaffList with better branch_id handling
export const fetchStaffList = async () => {
  try {
    const token = localStorage.getItem("branchToken");
    const branchId = localStorage.getItem("branchId") || localStorage.getItem("branch_id");
    
    const params = {};
    if (branchId) {
      params.branch_id = branchId;
    }
    
    const res = await axios.get(`${apiBaseUrl}/api/staff/`, {
      headers: { Authorization: `Bearer ${token}` },
      params: params
    });
    return res.data;
  } catch (err) {
    console.error("Error fetching staff list:", err);
    return [];
  }
};


// Function to check payment status of a job
export const getJobPaymentStatus = (job, operation) => {
  switch(operation) {
    case 'singer':
      return {
        isPaid: Boolean(job.singer_paid) && job.singer_paid !== '0' && job.singer_paid !== 0,
        paidAt: job.singer_paid_at,
        paymentId: job.singer_payment_id,
        operator: job.staff_name,
        amount: job.gross_amount
      };
    case 'flatlock':
      return {
        isPaid: Boolean(job.flatlock_paid) && job.flatlock_paid !== '0' && job.flatlock_paid !== 0,
        paidAt: job.flatlock_paid_at,
        paymentId: job.flatlock_payment_id,
        operator: job.flatlock_operator,
        amount: job.flatlock_gross_amount
      };
    case 'overlock':
      // 🔥 SIMPLIFIED FIX: Simple overlock paid check
      const overlockPaid = job.overlock_paid === 1 || job.overlock_paid === '1' || job.overlock_paid === true;
      return {
        isPaid: overlockPaid,
        paidAt: job.overlock_paid_at,
        paymentId: job.overlock_payment_id,
        operator: job.overlock_operator,
        amount: job.overlock_gross_amount
      };
    default:
      return {
        isPaid: Boolean(job.is_paid) && job.is_paid !== '0' && job.is_paid !== 0,
        paidAt: job.updated_at,
        paymentId: job.payment_id,
        operator: job.staff_name,
        amount: job.gross_amount
      };
  }
};

// Function to get all payment statuses for a job
export const getAllPaymentStatuses = (job) => {
  return {
    singer: {
      isPaid: Boolean(job.singer_paid) && job.singer_paid !== '0' && job.singer_paid !== 0,
      paidAt: job.singer_paid_at,
      paymentId: job.singer_payment_id,
      operator: job.staff_name,
      amount: job.gross_amount
    },
    flatlock: {
      isPaid: Boolean(job.flatlock_paid) && job.flatlock_paid !== '0' && job.flatlock_paid !== 0,
      paidAt: job.flatlock_paid_at,
      paymentId: job.flatlock_payment_id,
      operator: job.flatlock_operator,
      amount: job.flatlock_gross_amount
    },
    overlock: {
      // 🔥 SIMPLIFIED FIX: Simple overlock paid check
      isPaid: job.overlock_paid === 1 || job.overlock_paid === '1' || job.overlock_paid === true,
      paidAt: job.overlock_paid_at,
      paymentId: job.overlock_payment_id,
      operator: job.overlock_operator,
      amount: job.overlock_gross_amount
    }
  };
};

// Function to check if job is completely paid
export const isJobCompletelyPaid = (job) => {
  const statuses = getAllPaymentStatuses(job);
  
  let requiredOperations = [];
  if (job.staff_name) requiredOperations.push('singer');
  if (job.flatlock_operator) requiredOperations.push('flatlock');
  if (job.overlock_operator) requiredOperations.push('overlock');
  
  return requiredOperations.every(op => statuses[op].isPaid);
};

// Function to get unpaid amount for specific operation
export const getUnpaidAmountForOperation = (job, operation) => {
  const status = getJobPaymentStatus(job, operation);
  return status.isPaid ? 0 : (status.amount || 0);
};

// Function to get total unpaid amount for operator across all operations
export const getTotalUnpaidAmount = (operator, jobs) => {
  let total = 0;
  
  jobs.forEach(job => {
    // Singer amount
    if (job.staff_name === operator) {
      const singerPaid = Boolean(job.singer_paid) && job.singer_paid !== '0' && job.singer_paid !== 0;
      if (!singerPaid) {
        total += parseFloat(job.gross_amount || 0);
      }
    }
    
    // Flatlock amount
    if (job.flatlock_operator === operator) {
      const flatlockPaid = Boolean(job.flatlock_paid) && job.flatlock_paid !== '0' && job.flatlock_paid !== 0;
      if (!flatlockPaid) {
        total += parseFloat(job.flatlock_gross_amount || 0);
      }
    }
    
    // Overlock amount
    if (job.overlock_operator === operator) {
      // 🔥 SIMPLIFIED FIX: Simple overlock paid check
      const overlockPaid = job.overlock_paid === 1 || job.overlock_paid === '1' || job.overlock_paid === true;
      if (!overlockPaid) {
        total += parseFloat(job.overlock_gross_amount || 0);
      }
    }
  });
  
  return total;
};

// 🔥 CRITICAL FIX: Simplified filterJobsByPaymentStatus function
export const filterJobsByPaymentStatus = (jobs, operation, isPaid = false) => {
  return jobs.filter(job => {
    switch(operation) {
      case 'singer':
        if (!job.staff_name) return false;
        const singerPaid = Boolean(job.singer_paid) && job.singer_paid !== '0' && job.singer_paid !== 0;
        return singerPaid === isPaid;
        
      case 'flatlock':
        if (!job.flatlock_operator) return false;
        const flatlockPaid = Boolean(job.flatlock_paid) && job.flatlock_paid !== '0' && job.flatlock_paid !== 0;
        return flatlockPaid === isPaid;
        
      case 'overlock':
        if (!job.overlock_operator) return false;
        // 🔥 SIMPLIFIED FIX: Simple overlock paid checking
        const overlockPaid = job.overlock_paid === 1 || job.overlock_paid === '1' || job.overlock_paid === true;
        console.log('filterJobsByPaymentStatus overlock:', { 
          jobId: job.id, 
          operator: job.overlock_operator, 
          overlock_paid: job.overlock_paid, 
          overlockPaid: overlockPaid,
          isPaid: isPaid,
          matches: overlockPaid === isPaid
        });
        return overlockPaid === isPaid;
        
      default:
        const defaultPaid = Boolean(job.is_paid) && job.is_paid !== '0' && job.is_paid !== 0;
        return defaultPaid === isPaid;
    }
  });
};

// Function to get payment summary for an operator
export const getOperatorPaymentSummary = (operator, jobs) => {
  const summary = {
    singer: { unpaid: 0, paid: 0, unpaidJobs: [], paidJobs: [] },
    flatlock: { unpaid: 0, paid: 0, unpaidJobs: [], paidJobs: [] },
    overlock: { unpaid: 0, paid: 0, unpaidJobs: [], paidJobs: [] }
  };
  
  jobs.forEach(job => {
    // Singer
    if (job.staff_name === operator) {
      const amount = parseFloat(job.gross_amount || 0);
      const singerPaid = Boolean(job.singer_paid) && job.singer_paid !== '0' && job.singer_paid !== 0;
      if (singerPaid) {
        summary.singer.paid += amount;
        summary.singer.paidJobs.push(job);
      } else {
        summary.singer.unpaid += amount;
        summary.singer.unpaidJobs.push(job);
      }
    }
    
    // Flatlock
    if (job.flatlock_operator === operator) {
      const amount = parseFloat(job.flatlock_gross_amount || 0);
      const flatlockPaid = Boolean(job.flatlock_paid) && job.flatlock_paid !== '0' && job.flatlock_paid !== 0;
      if (flatlockPaid) {
        summary.flatlock.paid += amount;
        summary.flatlock.paidJobs.push(job);
      } else {
        summary.flatlock.unpaid += amount;
        summary.flatlock.unpaidJobs.push(job);
      }
    }
    
    // Overlock
    if (job.overlock_operator === operator) {
      const amount = parseFloat(job.overlock_gross_amount || 0);
      // 🔥 SIMPLIFIED FIX: Simple overlock paid checking
      const overlockPaid = job.overlock_paid === 1 || job.overlock_paid === '1' || job.overlock_paid === true;
      if (overlockPaid) {
        summary.overlock.paid += amount;
        summary.overlock.paidJobs.push(job);
      } else {
        summary.overlock.unpaid += amount;
        summary.overlock.unpaidJobs.push(job);
      }
    }
  });
  
  return summary;
};

// 🔥 MAIN FIX: Simplified hasUnpaidJobs function - This is the key fix!
export const hasUnpaidJobs = (operator, jobs, operation) => {
  console.log(`🔍 hasUnpaidJobs checking for ${operator} in ${operation}:`, jobs.length, 'total jobs');
  
  const operatorJobs = jobs.filter(job => {
    switch(operation) {
      case 'singer':
        return job.staff_name === operator;
      case 'flatlock':
        return job.flatlock_operator === operator;
      case 'overlock':
        return job.overlock_operator === operator;
      default:
        return false;
    }
  });
  
  console.log(`📋 Operator jobs for ${operator}:`, operatorJobs.length);
  
  const unpaidJobs = operatorJobs.filter(job => {
    switch(operation) {
      case 'singer':
        const singerPaid = Boolean(job.singer_paid) && job.singer_paid !== '0' && job.singer_paid !== 0;
        return !singerPaid;
      case 'flatlock':
        const flatlockPaid = Boolean(job.flatlock_paid) && job.flatlock_paid !== '0' && job.flatlock_paid !== 0;
        return !flatlockPaid;
      case 'overlock':
        // 🔥 SIMPLIFIED FIX: Simple overlock unpaid checking - KEY FIX!
        const overlockPaid = job.overlock_paid === 1 || job.overlock_paid === '1' || job.overlock_paid === true;
        
        console.log(`🔥 hasUnpaidJobs overlock check:`, {
          jobId: job.id,
          operator: job.overlock_operator,
          overlock_paid: job.overlock_paid,
          type: typeof job.overlock_paid,
          overlockPaid: overlockPaid,
          isUnpaid: !overlockPaid
        });
        
        return !overlockPaid;
      default:
        return false;
    }
  });
  
  console.log(`💰 Unpaid jobs for ${operator} in ${operation}:`, unpaidJobs.length);
  console.log(`🔥 HAS UNPAID RESULT:`, unpaidJobs.length > 0);
  
  return unpaidJobs.length > 0;
};

// Print receipt function
export const handlePrintReceipt = async (entryData, jobs, slipRef) => {
  try {
    if (!slipRef.current) {
      return { success: false, message: "Print reference not found" };
    }

    // Add a small delay to ensure the slip is rendered
    await new Promise(resolve => setTimeout(resolve, 100));

    // Print the receipt
    const printWindow = window.open('', '_blank');
    const slipContent = slipRef.current.innerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Wage Receipt - ${entryData.operationName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              font-size: 14px;
            }
            .receipt { 
              max-width: 400px; 
              margin: 0 auto; 
              border: 1px solid #333;
              padding: 15px;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #333; 
              padding-bottom: 10px; 
              margin-bottom: 15px; 
            }
            .content { 
              line-height: 1.6; 
            }
            .footer { 
              border-top: 1px solid #333; 
              padding-top: 10px; 
              margin-top: 15px; 
              text-align: center;
              font-size: 12px;
            }
            .amount { 
              font-weight: bold; 
              font-size: 16px; 
            }
            .operation-badge {
              background: #007bff;
              color: white;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 12px;
              margin-left: 10px;
            }
          </style>
        </head>
        <body>
          ${slipContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait a moment before printing
    setTimeout(() => {
      printWindow.print();
      
      // Close print window after printing
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 500);

    return { success: true, message: "Receipt printed successfully" };
    
  } catch (error) {
    console.error("Error printing receipt:", error);
    return { success: false, message: "Failed to print receipt" };
  }
};

// Function to format payment status for display
export const formatPaymentStatus = (job, operation) => {
  const status = getJobPaymentStatus(job, operation);
  
  if (status.isPaid) {
    return {
      status: 'PAID',
      color: 'green',
      date: status.paidAt ? new Date(status.paidAt).toLocaleDateString() : 'N/A',
      amount: status.amount
    };
  } else {
    return {
      status: 'UNPAID',
      color: 'red',
      date: null,
      amount: status.amount
    };
  }
};

// Function to get payment history for an operator
export const getPaymentHistory = async (operator, operation, branchId) => {
  try {
    const token = localStorage.getItem("branchToken");
    if (!token) throw new Error("No authentication token");

    const response = await axios.get(`${apiBaseUrl}/api/wages/payment-history/${operator}`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { branch_id: branchId, operation: operation }
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return { success: false, error: error.message };
  }
};

// Function to validate payment data before submission
export const validatePaymentData = (paymentData, activeTab) => {
  const errors = [];

  if (!paymentData.operator || paymentData.operator.trim() === '') {
    errors.push('Operator name is required');
  }

  if (!paymentData.jobs || paymentData.jobs.length === 0) {
    errors.push('No jobs selected for payment');
  }

  if (parseFloat(paymentData.grossAmount) <= 0) {
    errors.push('Gross amount must be greater than 0');
  }

  if (parseFloat(paymentData.payableAmount) < 0) {
    errors.push('Payable amount cannot be negative');
  }

  if (parseFloat(paymentData.deduction || 0) > parseFloat(paymentData.grossAmount)) {
    errors.push('Deduction cannot be greater than gross amount');
  }

  // Check if jobs are already paid for the current operation
  const alreadyPaidJobs = paymentData.jobs.filter(job => {
    const status = getJobPaymentStatus(job, activeTab);
    return status.isPaid;
  });

  if (alreadyPaidJobs.length > 0) {
    errors.push(`${alreadyPaidJobs.length} job(s) already paid for ${activeTab} operation`);
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

// Function to get advance payment ID for a staff member
export const getAdvancePaymentId = async (staffId) => {
  if (!staffId) return null;

  try {
    const token = localStorage.getItem("branchToken");
    if (!token) throw new Error("No authentication token");

    const response = await axios.get(`${apiBaseUrl}/api/advance-payments`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { staff_id: staffId }
    });

    if (response.data.success && response.data.advance_payments) {
      const pendingAdvance = response.data.advance_payments.find(ap => 
        parseFloat(ap.amount) > 0 && !ap.is_paid
      );
      console.log("🎯 Found advance payment:", pendingAdvance);
      return pendingAdvance?.id || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching advance payment ID:", error);
    return null;
  }
};

// Function to format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount || 0);
};

// Function to get pending advance balance
export const getPendingAdvanceBalance = async (staffId) => {
  if (!staffId) return 0;

  try {
    const token = localStorage.getItem("branchToken");
    if (!token) return 0;

    const response = await axios.get(`${apiBaseUrl}/api/advance-payments`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { staff_id: staffId }
    });

    if (response.data.success && response.data.advance_payments) {
      const totalBalance = response.data.advance_payments
        .filter(ap => !ap.is_paid)
        .reduce((sum, ap) => sum + parseFloat(ap.amount || 0), 0);
      
      return totalBalance;
    }
    return 0;
  } catch (error) {
    console.error("Error fetching advance balance:", error);
    return 0;
  }
};
