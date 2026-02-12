import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface AuditLogRow {
  id: string;
  date: string;
  member: string;
  actionLabel: string;
  description: string;
}

export interface AuditPDFOptions {
  logs: AuditLogRow[];
  filters?: {
    searchTerm?: string;
    memberFilter?: string;
    actionFilter?: string;
    dateRange?: string;
  };
  organizationName?: string;
}

/**
 * Generate and download a formal PDF report of audit logs
 */
export function generateAuditPDF(options: AuditPDFOptions): void {
  const { logs, filters, organizationName = "Data Room" } = options;
  
  // Create new PDF document
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Add header with logo and title
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Title
  doc.setFontSize(20);
  // Mustard yellow primary color
  doc.setTextColor(202, 138, 4);
  doc.text("Audit Log Report", pageWidth / 2, 20, { align: "center" });
  
  // Organization name
  doc.setFontSize(12);
  // Slightly muted mustard tone
  doc.setTextColor(180, 132, 10);
  doc.text(organizationName, pageWidth / 2, 28, { align: "center" });
  
  // Generation date
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const generatedDate = new Date().toLocaleString();
  doc.text(`Generated: ${generatedDate}`, pageWidth / 2, 34, { align: "center" });
  
  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, 38, pageWidth - 15, 38);
  
  // Filter information section
  let yPosition = 45;
  if (filters) {
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.text("Applied Filters:", 15, yPosition);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    yPosition += 5;
    
    const filterLines: string[] = [];
    if (filters.dateRange) {
      filterLines.push(`Period: ${filters.dateRange}`);
    }
    if (filters.memberFilter && filters.memberFilter !== "all") {
      filterLines.push(`Member: ${filters.memberFilter}`);
    }
    if (filters.actionFilter && filters.actionFilter !== "all") {
      filterLines.push(`Action: ${filters.actionFilter}`);
    }
    if (filters.searchTerm) {
      filterLines.push(`Search: "${filters.searchTerm}"`);
    }
    
    if (filterLines.length > 0) {
      doc.text(filterLines.join(" | "), 15, yPosition);
      yPosition += 5;
    } else {
      doc.text("No filters applied", 15, yPosition);
      yPosition += 5;
    }
  }
  
  // Summary section
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Records: ${logs.length}`, 15, yPosition);
  yPosition += 8;
  
  // Prepare table data
  const tableData = logs.map((log) => [
    log.date,
    log.member,
    log.actionLabel,
    log.description,
  ]);
  
  // Generate table
  autoTable(doc, {
    startY: yPosition,
    head: [["Date", "Member", "Action", "Description"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      // Mustard yellow header background
      fillColor: [202, 138, 4],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      // Slightly warm border color to complement mustard theme
      lineColor: [234, 179, 8],
      lineWidth: 0.1,
    },
    // Soft mustard-tinted alternate row background
    alternateRowStyles: {
      fillColor: [255, 251, 235],
    },
    columnStyles: {
      0: { cellWidth: 50 }, // Date (wider to fit full timestamps)
      1: { cellWidth: 35 }, // Member
      2: { cellWidth: 25 }, // Action
      3: { cellWidth: "auto" }, // Description
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      // Footer on each page
      const pageNum = doc.internal.pages.length - 1;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${pageNum}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
      
      // Footer text
      doc.setFontSize(7);
      doc.text(
        "Confidential - For authorized personnel only",
        15,
        pageHeight - 10
      );
      
      doc.text(
        organizationName,
        pageWidth - 15,
        pageHeight - 10,
        { align: "right" }
      );
    },
  });
  
  // Save the PDF
  const fileName = `audit-log-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
