
import { jsPDF } from "jspdf";

export async function createColoringBookPDF(name: string, theme: string, images: string[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // COVER PAGE
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');
  
  doc.setFontSize(30);
  doc.setTextColor(40, 40, 40);
  doc.text(`${name}'s`, width / 2, height / 2 - 40, { align: 'center' });
  
  doc.setFontSize(48);
  doc.text(`Magic Coloring Book`, width / 2, height / 2, { align: 'center' });
  
  doc.setFontSize(20);
  doc.text(`Theme: ${theme}`, width / 2, height / 2 + 60, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text("Generated with Magic AI", width / 2, height - 40, { align: 'center' });

  // IMAGE PAGES
  for (const imageUrl of images) {
    doc.addPage();
    // Add border
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 20, width - 40, height - 40);
    
    // Add image
    try {
      doc.addImage(imageUrl, 'PNG', 40, 40, width - 80, width - 80);
    } catch (e) {
      console.error("Error adding image to PDF", e);
    }
    
    doc.setFontSize(12);
    doc.text(`${name}'s World`, width / 2, height - 30, { align: 'center' });
  }

  doc.save(`${name}_Coloring_Book.pdf`);
}
