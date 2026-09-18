# Victor Organization Demo Data

Synthetic demo dataset derived from the department roles and missions in `~/Downloads/Argus_Client_Victor.pdf`.

This dataset contains no real customer, employee, or financial records. Names, IDs, amounts, and contact details are fabricated for Argus demonstrations.

## Organization model

- `Marketing`: market insight, campaign planning, creative translation, partner evaluation.
- `ProductProcurement`: product specifications, development, ordering, cycle management.
- `Warehouse`: inbound QC, fulfillment, logistics, and inventory.
- `ThirdPartyEcommerce`: marketplace sales and reconciliation.
- `BrandWebsite`: website/social sales and advertising.
- `StoreCustomerService`: B2B sales, showroom demonstrations, calls, Line@, customer insight.
- `HRAccounting`: company-wide support, personnel/accounting accuracy.
- `CompanyWide`: competition and regulatory monitoring.

## Files

- `product_catalog.csv`: product and cost data; margin/cost fields are sensitive.
- `inventory_movements.csv`: stock, QC, warehouse, and supplier operations.
- `sales_orders.csv`: omnichannel orders, revenue, customer, and fulfillment data.
- `campaign_performance.csv`: advertising and website campaign performance.
- `b2b_opportunities.csv`: store/B2B pipeline and customer contacts.
- `support_tickets.csv`: customer-support cases and internal notes.
- `hr_accounting_summary.csv`: deliberately restricted personnel/accounting summary.
- `competition_regulatory_watch.csv`: company-wide competitor and regulatory watch.
- `argus_demo_cases.csv`: scripted questions and the expected recipient-specific view.

## Argus demo thesis

The same source data is intentionally useful to multiple teams, but raw files expose more than each team needs. Argus should provide a policy-specific view at retrieval time:

```text
One operational data plane
  + identity / role / purpose
  → filtered, masked, or aggregated view
  → human or AI agent
```

This is contrasted with per-file permissions, where users either receive an entire file or are blocked and teams create duplicated exports.

## Suggested demo identities

- `marketing_analyst_01`: Marketing
- `warehouse_lead_01`: Warehouse
- `marketplace_ops_01`: ThirdPartyEcommerce
- `brand_growth_01`: BrandWebsite
- `store_sales_01`: StoreCustomerService
- `finance_controller_01`: HRAccounting
- `competitor_watch_agent`: CompanyWide AI agent
- `ops_summary_agent`: cross-functional AI agent with restricted purpose

## Intended Argus transformations

- `ALLOW`: business fields required for the role.
- `REDACT`: contact details, private notes, personal identifiers.
- `MASK`: customer IDs, supplier IDs, order references.
- `PROJECT`: aggregate revenue, stock, campaign, or pipeline data.
- `REVIEW`: mixed-purpose or ambiguous requests.

All records are synthetic and safe for demos, screenshots, local RAG experiments, and policy simulations.

## Expanded RAG corpus

The dataset now includes larger synthetic CSVs plus `rag_documents/`, a narrative document corpus designed for retrieval demos. Use `RAG_DEMO_GUIDE.md` for the per-file-permission versus RAG versus Argus-protected RAG walkthrough.

Expanded counts: product catalog 15 products; sales orders 72; inventory movements 48; campaigns 24; support tickets 30; B2B opportunities 18; narrative RAG documents 10.
