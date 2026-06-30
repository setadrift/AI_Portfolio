import { NextResponse } from "next/server";

type StudioDesignerImportRequest = {
  csv?: string;
};

type StudioDesignerItem = {
  blockedReason: string;
  clientApprovalStatus: string;
  expectedDeliveryDate: string;
  invoiceStatus: string;
  itemName: string;
  projectName: string;
  purchaseOrderStatus: string;
  room: string;
  status: string;
  supplier: string;
};

const REQUIRED_COLUMNS = [
  "Project",
  "Room",
  "Supplier",
  "Item",
  "Status",
  "Client Approval",
  "PO Status",
  "Invoice Status",
  "Expected Delivery",
  "Blocked Reason",
];

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseStudioCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { error: "CSV must include a header row and at least one data row." };
  }

  const headers = parseCsvLine(lines[0]);
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

  if (missingColumns.length > 0) {
    return { error: "CSV is missing required columns.", missingColumns };
  }

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });

  const items: StudioDesignerItem[] = rows.map((row) => ({
    projectName: row.Project,
    room: row.Room,
    supplier: row.Supplier,
    itemName: row.Item,
    status: row.Status,
    clientApprovalStatus: row["Client Approval"],
    purchaseOrderStatus: row["PO Status"],
    invoiceStatus: row["Invoice Status"],
    expectedDeliveryDate: row["Expected Delivery"],
    blockedReason: row["Blocked Reason"],
  }));

  return { items };
}

function riskForItem(item: StudioDesignerItem) {
  if (item.status === "Delayed") return "supplier_delay";
  if (item.clientApprovalStatus === "Pending") return "client_approval_pending";
  if (item.invoiceStatus === "Overdue") return "finance_attention";
  if (item.purchaseOrderStatus === "Required") return "purchase_order_required";
  return null;
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/willowops/studio-designer/import",
    purpose:
      "Prototype adapter for Studio Designer exports. Accepts CSV text and normalizes procurement/design items into WillowOps risk events.",
    requiredColumns: REQUIRED_COLUMNS,
  });
}

export async function POST(request: Request) {
  let payload: StudioDesignerImportRequest;

  try {
    payload = (await request.json()) as StudioDesignerImportRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.csv) {
    return NextResponse.json(
      {
        error: "Missing csv field.",
        expectedShape: {
          csv: REQUIRED_COLUMNS.join(",") + "\\n...",
        },
      },
      { status: 400 },
    );
  }

  const parsed = parseStudioCsv(payload.csv);

  if ("error" in parsed) {
    return NextResponse.json(parsed, { status: 400 });
  }

  const normalizedItems = parsed.items.map((item) => ({
    ...item,
    riskEvent: riskForItem(item),
    humanReviewRequired: Boolean(riskForItem(item)),
  }));

  return NextResponse.json({
    sourceSystem: "Studio Designer",
    adapterMode: "csv_export",
    importedCount: normalizedItems.length,
    reviewQueueCount: normalizedItems.filter((item) => item.humanReviewRequired).length,
    normalizedItems,
    recommendedActions: [
      "Match each Studio Designer project name to the Monday.com Design Projects board.",
      "Flag delayed or approval-pending procurement items in Monday.com.",
      "Surface item-level delivery risk on the management dashboard.",
    ],
  });
}
