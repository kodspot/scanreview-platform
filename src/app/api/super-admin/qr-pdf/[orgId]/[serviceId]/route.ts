import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { getSessionUser } from "@/lib/auth/session";
import { getPublicReviewExperience } from "@/lib/services/public-review-service";

const MM_TO_PT = 2.8346456693;

function mm(value: number) {
  return value * MM_TO_PT;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const safe = normalized.length === 6 ? normalized : "0f172a";
  const intValue = parseInt(safe, 16);
  return {
    r: ((intValue >> 16) & 255) / 255,
    g: ((intValue >> 8) & 255) / 255,
    b: (intValue & 255) / 255,
  };
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

type TileInput = {
  x: number;
  y: number;
  w: number;
  h: number;
  orgName: string;
  serviceName: string;
  targetUrl: string;
  primaryHex: string;
  accentHex: string;
  qrImage: Awaited<ReturnType<PDFDocument["embedPng"]>>;
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  fontRegular: Awaited<ReturnType<PDFDocument["embedFont"]>>;
};

export const runtime = "nodejs";

function drawTile(page: PDFPage, input: TileInput) {
  const primary = hexToRgb(input.primaryHex);
  const accent = hexToRgb(input.accentHex);

  page.drawRectangle({ x: input.x, y: input.y, width: input.w, height: input.h, color: rgb(1, 1, 1) });
  page.drawRectangle({
    x: input.x,
    y: input.y + input.h - mm(6),
    width: input.w,
    height: mm(6),
    color: rgb(primary.r, primary.g, primary.b),
  });

  const textX = input.x + mm(5);
  const textTopY = input.y + input.h - mm(14);

  page.drawText(input.orgName.slice(0, 40), {
    x: textX,
    y: textTopY,
    size: 11,
    font: input.fontBold,
    color: rgb(primary.r, primary.g, primary.b),
  });

  page.drawText(input.serviceName.slice(0, 50), {
    x: textX,
    y: textTopY - mm(4.8),
    size: 7.5,
    font: input.fontBold,
    color: rgb(0.2, 0.26, 0.33),
  });

  page.drawText("Scan and share feedback in under 10 seconds.", {
    x: textX,
    y: textTopY - mm(9),
    size: 6,
    font: input.fontRegular,
    color: rgb(0.39, 0.45, 0.55),
  });

  const qrSize = Math.min(input.w * 0.52, input.h * 0.52);
  const qrX = input.x + (input.w - qrSize) / 2;
  const qrY = input.y + (input.h - qrSize) / 2 - mm(4);

  page.drawRectangle({
    x: qrX - mm(2),
    y: qrY - mm(2),
    width: qrSize + mm(4),
    height: qrSize + mm(4),
    color: rgb(0.95, 0.97, 0.97),
  });

  page.drawImage(input.qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  page.drawText(input.targetUrl.slice(0, 70), {
    x: textX,
    y: input.y + mm(9.5),
    size: 5.4,
    font: input.fontRegular,
    color: rgb(0.58, 0.64, 0.72),
  });

  page.drawText("Kodspot ScanReview - 300 DPI", {
    x: textX,
    y: input.y + mm(5),
    size: 5.2,
    font: input.fontRegular,
    color: rgb(0.58, 0.64, 0.72),
  });

  page.drawRectangle({
    x: input.x,
    y: input.y,
    width: input.w,
    height: 1,
    color: rgb(accent.r, accent.g, accent.b),
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; serviceId: string }> },
) {
  const session = await getSessionUser();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { orgId, serviceId } = await params;
  const url = new URL(request.url);
  const size = (url.searchParams.get("size") || "a6").toLowerCase();

  const experience = await getPublicReviewExperience(orgId, serviceId);
  if (!experience) {
    return NextResponse.json({ message: "Service not found" }, { status: 404 });
  }

  const targetUrl = `${process.env.APP_URL || "http://localhost:3000"}/r/${orgId}/${serviceId}`;
  const qrDataUrl = await QRCode.toDataURL(targetUrl, {
    margin: 1,
    width: 900,
    color: {
      dark: experience.organization.theme.primary,
      light: "#ffffff",
    },
  });

  const pdf = await PDFDocument.create();
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const qrImage = await pdf.embedPng(dataUrlToBytes(qrDataUrl));

  const orgName = experience.organization.name;
  const serviceName = experience.service.name;
  const primaryHex = experience.organization.theme.primary;
  const accentHex = experience.organization.theme.accent;

  if (size === "a4") {
    const page = pdf.addPage([mm(210), mm(297)]);
    const gap = mm(5);
    const pad = mm(5);
    const tileW = (mm(210) - pad * 2 - gap) / 2;
    const tileH = (mm(297) - pad * 2 - gap) / 2;

    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const x = pad + col * (tileW + gap);
        const y = mm(297) - pad - (row + 1) * tileH - row * gap;
        drawTile(page, {
          x,
          y,
          w: tileW,
          h: tileH,
          orgName,
          serviceName,
          targetUrl,
          primaryHex,
          accentHex,
          qrImage,
          fontBold,
          fontRegular,
        });
      }
    }
  } else if (size === "a3") {
    const page = pdf.addPage([mm(297), mm(420)]);
    const gap = mm(5);
    const pad = mm(5);
    const tileW = (mm(297) - pad * 2 - gap) / 2;
    const tileH = (mm(420) - pad * 2 - gap * 3) / 4;

    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const x = pad + col * (tileW + gap);
        const y = mm(420) - pad - (row + 1) * tileH - row * gap;
        drawTile(page, {
          x,
          y,
          w: tileW,
          h: tileH,
          orgName,
          serviceName,
          targetUrl,
          primaryHex,
          accentHex,
          qrImage,
          fontBold,
          fontRegular,
        });
      }
    }
  } else {
    const page = pdf.addPage([mm(105), mm(148)]);
    drawTile(page, {
      x: 0,
      y: 0,
      w: mm(105),
      h: mm(148),
      orgName,
      serviceName,
      targetUrl,
      primaryHex,
      accentHex,
      qrImage,
      fontBold,
      fontRegular,
    });
  }

  const bytes = await pdf.save();
  const filename = `${orgId}_${serviceId}_${size}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
