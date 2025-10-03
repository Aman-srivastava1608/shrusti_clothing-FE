import React, { forwardRef } from 'react';
import CompanyLogo from '../../../../../assets/shrusti-logo.png';

// Helper function to format date
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB");
    } catch (error) {
        return 'N/A';
    }
};

// Helper function to safely render values
const renderSafeValue = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
};

const WageSlip = forwardRef(({ entry, sizeDetails }, ref) => {
    // Safety check
    if (!entry) {
        return (
            <div ref={ref} className="receipt">
                <div className="error">No entry data provided</div>
            </div>
        );
    }

    // Extract properties with fallbacks
    const {
        staffName = 'N/A',
        operationName = 'N/A',
        date = new Date().toLocaleDateString("en-GB"),
        grossAmount = '0',
        deduction = '0',
        payableAmount = '0',
        paymentType = 'Cash',
        operationType = 'N/A'
    } = entry;

    // Check if this is flatlock/overlock operation
    const isFlatlockOrOverlock = (
        operationName?.toLowerCase() === 'overlock' ||
        operationName?.toLowerCase() === 'flatlock' ||
        operationType?.toLowerCase() === 'overlock' ||
        operationType?.toLowerCase() === 'flatlock'
    );

    // Calculate totals properly with deduction
    const totalGrossFromJobs = sizeDetails && Array.isArray(sizeDetails)
        ? sizeDetails.reduce((sum, job) => {
            const jobAmount = parseFloat(job.gross_amount || job.flatlock_gross_amount || job.overlock_gross_amount || 0);
            return sum + jobAmount;
        }, 0)
        : parseFloat(grossAmount);

    // Ensure deduction is properly subtracted
    const finalGrossAmount = totalGrossFromJobs;
    const finalDeduction = parseFloat(deduction || 0);
    const finalPayableAmount = finalGrossAmount - finalDeduction;

    return (
        <div ref={ref} className="wage-receipt" style={{
            fontFamily: 'Arial, sans-serif',
            width: '210mm',
            minHeight: '297mm',
            margin: '0 auto',
            padding: '20mm',
            backgroundColor: 'white',
            fontSize: '14px',
            lineHeight: '1.4',
            color: '#000'
        }}>

            {/* HEADER - Exact as Image */}
            <div className="header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px',
                paddingBottom: '10px'
            }}>
                <div className="company-logo" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                }}>
                    <img
                        src={CompanyLogo}
                        alt="Shrusti Clothing Logo"
                        style={{
                            width: '100px',
                            height: 'auto',
                            borderRadius: '8px',
                            objectFit: 'contain'
                        }}
                    />
                    <div className="company-name" style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#000'
                    }}>
                        SHRUSTI<br />
                        <span style={{ fontSize: '24px' }}>CLOTHING</span>
                    </div>
                </div>

                <div className="wages-title" style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#1976d2'
                }}>
                    WAGES
                </div>
            </div>

            {/* STAFF INFO */}
            <div className="staff-info" style={{ marginBottom: '30px', fontSize: '18px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                }}>
                    <span><strong>Staff Name - </strong>{renderSafeValue(staffName)}</span>
                    <span><strong>{renderSafeValue(date)}</strong></span>
                </div>
                <div>
                    <span><strong>Operation Name - </strong>{renderSafeValue(operationName)}</span>
                </div>
            </div>

            {/* ENHANCED JOB DETAILS TABLE with Individual Singers */}
            <div className="jobs-table" style={{ marginBottom: '30px' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '16px'
                }}>
                    <thead>
                        <tr style={{
                            backgroundColor: '#1976d2',
                        }}>
                            <th style={{
                                padding: '12px 8px',
                                textAlign: 'center',
                                border: '1px solid #1976d2',
                                fontWeight: 'bold',
                                color: '#000'
                            }}>Date</th>
                            <th style={{
                                padding: '12px 8px',
                                textAlign: 'center',
                                border: '1px solid #1976d2',
                                fontWeight: 'bold',
                                color: '#000'
                            }}>
                                Product Name
                                {/* 🔥 RE-ADDED: Show Singer column header for flatlock/overlock */}
                                {isFlatlockOrOverlock && (
                                    <div style={{ fontSize: '12px', fontWeight: 'normal', marginTop: '2px', color: '#000' }}>
                                        (Singer Name)
                                    </div>
                                )}
                            </th>
                            <th style={{
                                padding: '12px 8px',
                                textAlign: 'center',
                                border: '1px solid #1976d2',
                                fontWeight: 'bold',
                                color: '#000'
                            }}>Qty(pcs)</th>
                            <th style={{
                                padding: '12px 8px',
                                textAlign: 'center',
                                border: '1px solid #1976d2',
                                fontWeight: 'bold',
                                color: '#000'
                            }}>Gross Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sizeDetails && Array.isArray(sizeDetails) && sizeDetails.length > 0 ? (
                            sizeDetails.map((job, index) => (
                                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                                    <td style={{
                                        padding: '10px 8px',
                                        textAlign: 'center',
                                        border: '1px solid #ddd',
                                        color: '#000'
                                    }}>
                                        {formatDate(job.date || job.created_at)}
                                    </td>
                                    <td style={{
                                        padding: '10px 8px',
                                        textAlign: 'center',
                                        border: '1px solid #ddd',
                                        color: '#000'
                                    }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                                            {renderSafeValue(job.product_name) || 'N/A'}
                                        </div>
                                        {/* 🔥 RE-ADDED: Show individual singer for each job */}
                                        {isFlatlockOrOverlock && job.staff_name && (
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#1976d2',
                                                fontWeight: 'bold',
                                                backgroundColor: '#e3f2fd',
                                                padding: '3px 6px',
                                                borderRadius: '4px',
                                                marginTop: '4px'
                                            }}>
                                                Singer: {renderSafeValue(job.staff_name)}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{
                                        padding: '10px 8px',
                                        textAlign: 'center',
                                        border: '1px solid #ddd',
                                        color: '#000'
                                    }}>
                                        {renderSafeValue(job.total_pieces || job.total_pcs || 0)}
                                    </td>
                                    <td style={{
                                        padding: '10px 8px',
                                        textAlign: 'center',
                                        border: '1px solid #ddd',
                                        color: '#000'
                                    }}>
                                        ₹{parseFloat(job.gross_amount || job.flatlock_gross_amount || job.overlock_gross_amount || 0).toFixed(2)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} style={{
                                    padding: '20px',
                                    textAlign: 'center',
                                    border: '1px solid #ddd',
                                    color: '#666'
                                }}>
                                    No job details available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* SUMMARY SECTION with FIXED CALCULATIONS */}
            <div className="summary-section" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginTop: '40px',
                paddingTop: '20px',
                borderTop: '2px solid #000'
            }}>
                <div className="thank-you-message" style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    lineHeight: '1.6'
                }}>
                    <div>Thank you for</div>
                    <div>Working with Shrusti</div>
                    <div>Clothing</div>
                </div>

                <div className="amount-details" style={{
                    minWidth: '300px',
                    fontSize: '16px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        paddingBottom: '5px'
                    }}>
                        <span>Total Gross Amount(Rs.):</span>
                        <span style={{ fontWeight: 'bold' }}>₹{finalGrossAmount.toFixed(2)}</span>
                    </div>
                    {finalDeduction > 0 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                            paddingBottom: '5px',
                            color: '#d32f2f'
                        }}>
                            <span>Deduction (Adv. Pay.):</span>
                            <span style={{ fontWeight: 'bold' }}>-₹{finalDeduction.toFixed(2)}</span>
                        </div>
                    )}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '15px',
                        paddingBottom: '10px',
                        borderBottom: '1px solid #000'
                    }}>
                        <span>Payable Amount (Rs.):</span>
                        <span style={{ fontWeight: 'bold' }}>₹{finalPayableAmount.toFixed(2)}</span>
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '15px',
                        paddingBottom: '10px',
                        borderBottom: '2px solid #000',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#1976d2'
                    }}>
                        <span>Total:</span>
                        <span>₹{finalPayableAmount.toFixed(2)}</span>
                    </div>
                    <div style={{
                        textAlign: 'right',
                        fontSize: '14px',
                        marginTop: '10px'
                    }}>
                        Paid by {renderSafeValue(paymentType).toUpperCase()}
                    </div>
                    {finalDeduction > 0 && (
                        <div style={{
                            marginTop: '15px',
                            padding: '10px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#666'
                        }}>
                            <div><strong>Calculation:</strong></div>
                            <div>₹{finalGrossAmount.toFixed(2)} - ₹{finalDeduction.toFixed(2)} = ₹{finalPayableAmount.toFixed(2)}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* ENHANCED FOOTER */}
            <div className="footer-signatures" style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '60px',
                paddingTop: '40px'
            }}>
                <div className="signature-left" style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: '40px', fontSize: '16px', fontWeight: 'bold' }}>
                        Operation Manager Sign.
                    </div>
                    <div style={{
                        borderBottom: '2px dotted #000',
                        width: '200px',
                        height: '2px'
                    }}></div>
                </div>

                <div className="signature-right" style={{ textAlign: 'right' }}>
                    <div style={{ marginBottom: '40px', fontSize: '16px', fontWeight: 'bold' }}>
                        Company Stamp
                    </div>
                    <div style={{
                        borderBottom: '2px dotted #000',
                        width: '200px',
                        height: '2px'
                    }}></div>
                </div>
            </div>
        </div>
    );
});

WageSlip.displayName = 'WageSlip';

export default WageSlip;