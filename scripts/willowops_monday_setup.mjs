#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";

const API_URL = "https://api.monday.com/v2";
const ROOT = new URL("..", import.meta.url).pathname;
const FIXTURE_DIR = join(ROOT, "outputs", "willowops-phase-1");
const APPLY = process.argv.includes("--apply");

const BOARD_IMPORTS = [
  {
    boardName: "Client Enquiries",
    fileName: "client-enquiries.csv",
    itemNameColumn: "Client",
    columnTypes: {
      Email: "email",
      Phone: "phone",
      "Lead Source": "text",
      "Budget Range": "text",
      Owner: "text",
      Status: "status",
      "Next Action": "long_text",
      "Last Touch": "date",
      "Automation Status": "status",
    },
  },
  {
    boardName: "Design Projects",
    fileName: "design-projects.csv",
    itemNameColumn: "Project",
    columnTypes: {
      Client: "text",
      "Service Type": "text",
      Stage: "status",
      "Lead Designer": "text",
      "Project Manager": "text",
      "Install Date": "date",
      "Risk Status": "status",
      "Next Action": "long_text",
      "Finance Status": "status",
    },
  },
  {
    boardName: "Procurement Tracker",
    fileName: "procurement-tracker.csv",
    itemNameColumn: "Item",
    columnTypes: {
      Project: "text",
      Room: "text",
      Supplier: "text",
      Status: "status",
      "Client Approval": "status",
      "PO Status": "status",
      "Invoice Status": "status",
      "Expected Delivery": "date",
      "Blocked Reason": "long_text",
    },
  },
  {
    boardName: "Automation Log",
    fileName: "automation-log.csv",
    itemNameColumn: "Event Type",
    columnTypes: {
      "Source System": "text",
      Project: "text",
      Status: "status",
      "Started At": "text",
      "Finished At": "text",
      "Retry Count": "numbers",
      "Human Review": "status",
      "Error Message": "long_text",
    },
  },
];

function parseCsvLine(line) {
  const values = [];
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

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headers = parseCsvLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });

  return { headers, rows };
}

function toMondayValue(type, value) {
  if (!value) return undefined;

  if (type === "status") return { label: value };
  if (type === "date") return { date: value };
  if (type === "email") return { email: value, text: value };
  if (type === "phone") return { phone: value };
  if (type === "numbers") return Number(value);
  if (type === "long_text") return { text: value };

  return value;
}

async function monday(query, variables, idempotencyKey) {
  const token = process.env.MONDAY_API_TOKEN;

  if (!token) {
    throw new Error("MONDAY_API_TOKEN is required when running with --apply");
  }

  const res = await fetch(API_URL, {
    body: JSON.stringify({ query, variables }),
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    method: "POST",
  });

  const data = await res.json();

  if (!res.ok || data.errors?.length) {
    throw new Error(JSON.stringify(data, null, 2));
  }

  return data.data;
}

async function createBoard(boardName) {
  const data = await monday(
    `mutation CreateBoard($boardName: String!) {
      create_board(board_name: $boardName, board_kind: public) {
        id
        name
      }
    }`,
    { boardName },
    `willowops-board-${boardName}`,
  );

  return data.create_board;
}

async function createColumn(boardId, title, type) {
  const data = await monday(
    `mutation CreateColumn($boardId: ID!, $title: String!, $type: ColumnType!) {
      create_column(board_id: $boardId, title: $title, column_type: $type) {
        id
        title
        type
      }
    }`,
    { boardId, title, type },
    `willowops-column-${boardId}-${title}`,
  );

  return data.create_column;
}

async function createItem(boardId, itemName, columnValues) {
  const data = await monday(
    `mutation CreateItem($boardId: ID!, $itemName: String!, $columnValues: JSON) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
        name
      }
    }`,
    {
      boardId,
      columnValues: JSON.stringify(columnValues),
      itemName,
    },
    `willowops-item-${boardId}-${itemName}`,
  );

  return data.create_item;
}

async function main() {
  console.log(`WillowOps Monday setup (${APPLY ? "apply" : "dry run"})`);

  for (const boardImport of BOARD_IMPORTS) {
    const csvPath = join(FIXTURE_DIR, boardImport.fileName);
    const { headers, rows } = parseCsv(await readFile(csvPath, "utf8"));
    const dataColumns = headers.filter((header) => header !== boardImport.itemNameColumn);

    console.log(`\nBoard: ${boardImport.boardName}`);
    console.log(`CSV: ${basename(csvPath)} (${rows.length} rows)`);
    console.log(`Item name column: ${boardImport.itemNameColumn}`);
    console.log(`Columns: ${dataColumns.join(", ")}`);

    if (!APPLY) continue;

    const board = await createBoard(boardImport.boardName);
    console.log(`Created board ${board.name} (${board.id})`);

    const createdColumns = new Map();
    for (const columnTitle of dataColumns) {
      const type = boardImport.columnTypes[columnTitle] ?? "text";
      const column = await createColumn(board.id, columnTitle, type);
      createdColumns.set(columnTitle, { id: column.id, type });
      console.log(`  Created column ${column.title} (${column.id}, ${column.type})`);
    }

    for (const row of rows) {
      const itemName = row[boardImport.itemNameColumn];
      const columnValues = {};

      for (const columnTitle of dataColumns) {
        const column = createdColumns.get(columnTitle);
        const mondayValue = column ? toMondayValue(column.type, row[columnTitle]) : undefined;

        if (mondayValue !== undefined) {
          columnValues[column.id] = mondayValue;
        }
      }

      const item = await createItem(board.id, itemName, columnValues);
      console.log(`  Created item ${item.name} (${item.id})`);
    }
  }

  if (!APPLY) {
    console.log("\nDry run only. To create boards, run:");
    console.log("MONDAY_API_TOKEN=... npm run willowops:monday:setup -- --apply");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
