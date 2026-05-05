const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
(async () => {
  for (const sz of ["a6", "a4", "a3"]) {
    const pdf = await PDFDocument.load(fs.readFileSync(`scripts/_smoke-${sz}.pdf`));
    const pages = pdf.getPages();
    const p = pages[0];
    const wMm = (p.getWidth() / 2.8346456693).toFixed(1);
    const hMm = (p.getHeight() / 2.8346456693).toFixed(1);
    console.log(
      `${sz.toUpperCase()}: pages=${pages.length} size=${wMm}x${hMm}mm title="${pdf.getTitle()}" creator="${pdf.getCreator()}"`,
    );
  }
})().catch((e) => { console.error(e); process.exit(1); });
