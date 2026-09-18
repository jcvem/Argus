# Victor Argus RAG Demo Guide

## Objective

Demonstrate that Argus can give an AI agent useful cross-functional answers without granting the agent raw access to every operational file.

## Recommended sequence

### 1. File-permission baseline

Pretend `ops_summary_agent` can access only `sales_orders.csv`. It cannot answer inventory or support questions without a human manually exporting more files.

### 2. RAG baseline

Index the `rag_documents/` folder and all CSV files. Without policy filtering, the agent can retrieve customer emails, private notes, payroll totals, supplier IDs, and prelaunch information.

### 3. Argus-protected RAG

Apply the role/purpose from `argus_demo_cases.csv` before retrieval and generation:

```text
ops_summary_agent + weekly_operations_summary
  → retrieve relevant sources
  → remove names, emails, payroll, absence days, private notes
  → aggregate by channel/product/category
  → send only the derived context to the AI
```

## Demonstration questions

- `ops_summary_agent`: 「請給我本週跨部門營運摘要。」
  - Return aggregate orders, revenue by channel, inventory exceptions, and ticket categories.
  - Do not return customer names, emails, payroll, or private notes.

- `warehouse_lead_01`: 「哪些品項需要優先處理？」
  - Return product, zone, quantity, QC status, and fulfillment status.
  - Remove customer and account-owner information.

- `marketing_analyst_01`: 「下一波官網廣告應該推什麼？」
  - Return campaign/product/channel performance and a ranking.
  - Remove supplier IDs, unit cost, and procurement notes.

- `store_sales_01`: 「本週哪些 B2B 商機需要跟進？」
  - Return stage, industry, weighted value, and next action.
  - Remove private notes and show contact details only when the policy explicitly allows the follow-up purpose.

## RAG value to demonstrate

RAG reduces manual file hunting by retrieving the relevant operational context across reports, SOPs, and structured exports. Argus adds the missing control plane:

```text
RAG decides what is relevant.
Argus decides what this identity and purpose may receive.
RedactCore / projection creates the safe view.
```

All data is synthetic and safe for local demos.
