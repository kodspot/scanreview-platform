import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/repositories/audit-logs";
import { incrementQrCodeDownload } from "@/lib/repositories/services";
import { getPublicReviewExperience } from "@/lib/services/public-review-service";
import { env } from "@/lib/env";

export const runtime = "nodejs";
// Avoid attempting to prerender this route at build time.
export const dynamic = "force-dynamic";

const MM_TO_PT = 2.8346456693;

const ALLOWED_SIZES = new Set(["a3", "a4", "a6"]);

function mm(value: number) {
  return value * MM_TO_PT;
}

function hexToRgb(hex: string) {
  const normalized = (hex || "").replace("#", "");
  const safe = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : "0f172a";
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
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { orgId, serviceId } = await params;

  const experience = await getPublicReviewExperience(orgId, serviceId);
  if (!experience) {
    return NextResponse.json({ message: "Service not found" }, { status: 404 });
  }

  // RBAC: super admins can download for any tenant; org users only for their own.
  if (session.role !== "super_admin") {
    const sessionOrgId = session.organizationId;
    const targetOrgId = experience.organization._id?.toString();
    if (!sessionOrgId || !targetOrgId || sessionOrgId !== targetOrgId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const url = new URL(request.url);
  const sizeParam = (url.searchParams.get("size") || "a6").toLowerCase();
  if (!ALLOWED_SIZES.has(sizeParam)) {
    return NextResponse.json(
      { message: "Invalid size. Use a3, a4, or a6." },
      { status: 400 },
    );
  }
  const size = sizeParam as "a3" | "a4" | "a6";

  const targetUrl = `${env.appUrl}/r/${orgId}/${serviceId}`;
  const qrDataUrl = await QRCode.toDataURL(targetUrl, {
    margin: 1,
    width: 900,
    color: {
      dark: experience.organization.theme.primary,
      light: "#ffffff",
    },
  });

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${experience.organization.name} — ${experience.service.name} — ${size.toUpperCase()}`);
  pdf.setSubject("ScanReview QR poster");
  pdf.setProducer("Kodspot ScanReview");
  pdf.setCreator("Kodspot ScanReview");
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const qrImage = await pdf.embedPng(dataUrlToBytes(qrDataUrl));

  const orgName = experience.organization.name;
  const serviceName = experience.service.name;
  const primaryHex = experience.organization.theme.primary;
  const accentHex = experience.organization.theme.accent;

  const tileBase = {
    orgName,
    serviceName,
    targetUrl,
    primaryHex,
    accentHex,
    qrImage,
    fontBold,
    fontRegular,
  };

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
        drawTile(page, { x, y, w: tileW, h: tileH, ...tileBase });
      }
    }
  } else if (size === "a3") {
    const page = pdf.addPage([mm(420), mm(297)]);
    const gap = mm(5);
    const pad = mm(5);
    const tileW = (mm(420) - pad * 2 - gap * 3) / 4;
    const tileH = (mm(297) - pad * 2 - gap) / 2;

    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const x = pad + col * (tileW + gap);
        const y = mm(297) - pad - (row + 1) * tileH - row * gap;
        drawTile(page, { x, y, w: tileW, h: tileH, ...tileBase });
      }
    }
  } else {
    const page = pdf.addPage([mm(105), mm(148)]);
    drawTile(page, { x: 0, y: 0, w: mm(105), h: mm(148), ...tileBase });
  }

  const bytes = await pdf.save();

  // Best-effort tracking — never let a write error prevent the download.
  try {
    if (experience.qrCode?._id) {
      await incrementQrCodeDownload(experience.qrCode._id);
    }
    await createAuditLog({
      actor: {
        userId: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
      },
      action: "qr.pdf_downloaded",
      summary: `Downloaded ${size.toUpperCase()} QR PDF for ${experience.organization.name} / ${experience.service.name}`,
      organizationPublicId: orgId,
      metadata: { serviceId, size },
      createdAt: new Date(),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[qr-pdf] tracking failed:", error);
    }
  }

  const filenameSafeOrg = experience.organization.slug || orgId;
  const filenameSafeService = experience.service.slug || serviceId;
  const filename = `${filenameSafeOrg}_${filenameSafeService}_${size}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
