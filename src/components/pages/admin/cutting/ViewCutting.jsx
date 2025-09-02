import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Eye, Edit, FileText } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import shrustiLogo from "../../../../assets/shrusti-logo.png"; // <-- Logo imported here
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;


// WageSlip component for PDF generation
const WageSlip = React.forwardRef(({ entry, sizeDetails }, ref) => {
  if (!entry) return null;

  return (
    <div
      ref={ref}
      style={{
        width: "210mm",
        height: "297mm",
        padding: "20mm",
        backgroundColor: "#ffffff",
        color: "#1f2937", // text-gray-800
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}> {/* Added flex container for logo and text */}
          <img src={shrustiLogo} alt="S.CLOTHING Logo" style={{ height: '70px', marginRight: '15px' }} /> {/* Logo size increased and margin added */}
          <div>
            <p style={{ fontSize: "2.25rem", fontWeight: "bold", margin: 0 }}>
              Shrusti
            </p>
            <p style={{ fontSize: "1.5rem", margin: 0 }}>
              clothing
            </p>
          </div>
        </div>
        <h2 style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#0071bc" }}>
          WAGES
        </h2>
      </div>

      <div style={{ marginBottom: "24px", fontSize: "1.125rem" }}>
        <p>
          <strong>Staff Name:</strong> {entry.cutting_master}
        </p>
        <p>
          <strong>Product Name:</strong> {entry.product_name}
        </p>
        <p>
          <strong>Operation Name:</strong> Cutting
        </p>
        <p>
          <strong>Date:</strong>{" "}
          {new Date(entry.created_at).toLocaleDateString("en-GB")}
        </p>
      </div>

      <div style={{ border: "1px solid black" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#0071bc", color: "#ffffff" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>
                Size Range(Y)
              </th>
              <th style={{ padding: "8px" }}>Price (Rs.)</th>
              <th style={{ padding: "8px" }}>Qty</th>
              <th style={{ padding: "8px" }}>Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {sizeDetails &&
              Object.entries(sizeDetails).map(([size, pcs]) => (
                <tr key={size} style={{ borderBottom: "1px solid #d1d5db" }}>
                  <td style={{ padding: "8px", textAlign: "left" }}>{size}</td>
                  <td style={{ padding: "8px" }}>
                    {parseFloat(entry.gross_amount / entry.total_pcs).toFixed(2) ||
                      0}
                  </td>
                  <td style={{ padding: "8px" }}>{pcs}</td>
                  <td style={{ padding: "8px" }}>
                    {parseFloat(
                      (entry.gross_amount / entry.total_pcs) * pcs
                    ).toFixed(2) || 0}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <div style={{ width: "50%" }}>
          <p>
            <strong>Gross Amount(Rs.):</strong> {entry.gross_amount}
          </p>
          <p>
            <strong>Deduction (Adv. Pay.):</strong> {entry.deduct_advance_pay}
          </p>
          <p>
            <strong>Payable Amount (Rs.):</strong> {entry.payable_amount}
          </p>
          <h4 style={{ fontWeight: "bold", fontSize: "1.125rem", marginTop: "8px" }}>
            Total: {entry.payable_amount}
          </h4>
        </div>
      </div>

      <div style={{ marginTop: "48px", display: "flex", justifyContent: "space-between" }}>
        <div style={{ width: "50%" }}>
          <p style={{ fontWeight: "bold" }}>Operation Manager Sign.</p>
          <div style={{ borderBottom: "1px solid black", marginTop: "32px" }}></div>
        </div>
        <div style={{ width: "50%", textAlign: "right" }}>
          <p style={{ fontWeight: "bold" }}>Company Stamp</p>
          <div style={{ borderBottom: "1px solid black", marginTop: "32px" }}></div>
        </div>
      </div>
    </div>
  );
});

// Main component
const CuttingEntryList = () => {
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({ masterName: "", date: "", amount: "" });
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({});
  const [entryToPrint, setEntryToPrint] = useState(null);
  const [sizeDetailsToPrint, setSizeDetailsToPrint] = useState(null);
  const slipRef = useRef();

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("branchToken");
      if (!token) return;
      const branchId = JSON.parse(atob(token.split(".")[1])).branch_id;
      const res = await axios.get(`${apiBaseUrl}/api/cutting-entry/list`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { branchId, ...filters },
      });
      setEntries(res.data);
    } catch (err) {
      console.error("Error fetching entries:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleViewDetails = (sizeWiseEntry) => {
    try {
      if (sizeWiseEntry && typeof sizeWiseEntry === "string") {
        const data = JSON.parse(sizeWiseEntry);
        setModalData(data);
        setShowModal(true);
      } else {
        setModalData({ message: "No size details available for this entry." });
        setShowModal(true);
      }
    } catch (error) {
      console.error("Error parsing size data:", error);
      setModalData({ message: "An error occurred while loading details." });
      setShowModal(true);
    }
  };

  const handlePrint = async (entry) => {
    setEntryToPrint(entry);
    const sizeDetails =
      entry.size_wise_entry && typeof entry.size_wise_entry === "string"
        ? JSON.parse(entry.size_wise_entry)
        : {};
    setSizeDetailsToPrint(sizeDetails);

    setTimeout(async () => {
      const canvas = await html2canvas(slipRef.current);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`WageSlip-${entry.inward_number}.pdf`);
      setEntryToPrint(null);
    }, 500);
  };

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          backgroundColor: "#0071bc",
          padding: "16px",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          color: "#ffffff",
        }}
      >
        <input
          type="text"
          placeholder="Staff Name search"
          style={{ padding: "8px", borderRadius: "6px", color: "#000000" }}
          value={filters.masterName}
          onChange={(e) => setFilters({ ...filters, masterName: e.target.value })}
        />
        <input
          type="date"
          style={{ padding: "8px", borderRadius: "6px", color: "#000000" }}
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
        />
        <input
          type="number"
          placeholder="Total Pieces"
          style={{ padding: "8px", borderRadius: "6px", color: "#000000" }}
          value={filters.amount}
          onChange={(e) => setFilters({ ...filters, amount: e.target.value })}
        />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
          <thead style={{ backgroundColor: "#0071bc", color: "#ffffff" }}>
            <tr>
              <th style={{ padding: "12px", textAlign: "left" }}>Master Name</th>
              <th style={{ padding: "12px" }}>Product Name</th>
              <th style={{ padding: "12px" }}>Inward Number</th>
              <th style={{ padding: "12px" }}>Fabric Weight</th>
              <th style={{ padding: "12px" }}>Total Pieces</th>
              <th style={{ padding: "12px" }}>Average</th>
              <th style={{ padding: "12px" }}>Gross Amount</th>
              <th style={{ padding: "12px" }}>Deduct Advance</th>
              <th style={{ padding: "12px" }}>Payable Amount</th>
              <th style={{ padding: "12px" }}>Payment Type</th>
              <th style={{ padding: "12px" }}>Date</th>
              <th style={{ padding: "12px" }}>Action</th>
            </tr>
          </thead>
          <tbody style={{ backgroundColor: "#ffffff", color: "#1f2937" }}>
            {entries.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "12px" }}>{row.cutting_master}</td>
                <td style={{ padding: "12px" }}>{row.product_name}</td>
                <td style={{ padding: "12px" }}>{row.inward_number}</td>
                <td style={{ padding: "12px" }}>{row.weight_of_fabric} KG</td>
                <td style={{ padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <span>{row.total_pcs}</span>
                  <button
                    onClick={() => handleViewDetails(row.size_wise_entry)}
                    style={{ color: "#4b5563" }}
                  >
                    <Eye size={20} />
                  </button>
                </td>
                <td style={{ padding: "12px" }}>{row.average}</td>
                <td style={{ padding: "12px" }}>₹{row.gross_amount}</td>
                <td style={{ padding: "12px" }}>₹{row.deduct_advance_pay}</td>
                <td style={{ padding: "12px" }}>₹{row.payable_amount}</td>
                <td style={{ padding: "12px" }}>{row.payment_type}</td>
                <td style={{ padding: "12px" }}>
                  {new Date(row.created_at).toLocaleDateString("en-GB")}
                </td>
                <td style={{ padding: "12px", display: "flex", gap: "8px", justifyContent: "center" }}>
                  <button style={{ color: "#4b5563" }}>
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handlePrint(row)}
                    style={{ color: "#16a34a" }}
                  >
                    <FileText size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          color: "#4b5563",
          padding: "12px",
          borderBottomLeftRadius: "16px",
          borderBottomRightRadius: "16px",
          display: "flex",
          justifyContent: "flex-end",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        Page 1, 2, 3, 4 ... 10
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(75, 85, 99, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "12px",
              maxWidth: "400px",
              width: "100%",
              color: "#1f2937",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "16px" }}>
              Size-wise Pieces
            </h3>
            {modalData.message ? (
              <p style={{ textAlign: "center", color: "#4b5563" }}>{modalData.message}</p>
            ) : (
              <ul style={{ listStyleType: "disc", paddingLeft: "16px", marginBottom: "24px" }}>
                {Object.entries(modalData).map(([size, pieces]) => (
                  <li key={size}>
                    <strong>{size}:</strong> {pieces} pcs
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                  padding: "8px 16px",
                  borderRadius: "8px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {entryToPrint && (
        <div style={{ position: "absolute", top: 0, left: 0, zIndex: -50 }}>
          <WageSlip ref={slipRef} entry={entryToPrint} sizeDetails={sizeDetailsToPrint} />
        </div>
      )}
    </div>
  );
};

export default CuttingEntryList;