/**
 * Convert all SVG elements inside a container to inline canvas elements
 * so that html2canvas can capture them (it cannot render SVGs natively).
 */
async function inlineSvgsToCanvas(container: HTMLElement): Promise<() => void> {
  const svgs = container.querySelectorAll("svg");
  const restoreFns: (() => void)[] = [];

  const loadPromises: Promise<void>[] = [];

  svgs.forEach((svg) => {
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const canvas = document.createElement("canvas");
    const rect = svg.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    const img = new Image();

    loadPromises.push(
      new Promise<void>((resolve) => {
        img.onload = () => {
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
      }),
    );
    img.src = url;

    const parent = svg.parentNode;
    if (parent) {
      parent.replaceChild(canvas, svg);
      restoreFns.push(() => parent.replaceChild(svg, canvas));
    }
  });

  await Promise.all(loadPromises);

  return () => restoreFns.forEach((fn) => fn());
}

export async function exportChartToPdf(
  element: HTMLElement,
  title: string
): Promise<void> {
  const html2canvas = (await import("html2canvas-pro")).default;
  const { jsPDF } = await import("jspdf");

  // Convert SVGs to canvas (html2canvas can't render SVGs)
  const restoreSvgs = await inlineSvgsToCanvas(element);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    pdf.setFontSize(16);
    pdf.text(title, margin, margin + 5);

    pdf.setFontSize(9);
    pdf.setTextColor(128);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 12);
    pdf.setTextColor(0);

    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const maxImgHeight = pageHeight - margin * 2 - 20;
    const finalHeight = Math.min(imgHeight, maxImgHeight);
    const finalWidth = (canvas.width * finalHeight) / canvas.height;

    pdf.addImage(
      imgData,
      "PNG",
      margin,
      margin + 18,
      Math.min(imgWidth, finalWidth),
      finalHeight
    );

    pdf.save(`analytics-${Date.now()}.pdf`);
  } finally {
    restoreSvgs();
  }
}
