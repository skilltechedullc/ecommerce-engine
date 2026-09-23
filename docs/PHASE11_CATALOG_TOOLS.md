# Phase 11 Product And Catalog Tools

Status: local catalog tooling is implemented.

## Implemented

- Admin product/variant CSV export.
- Admin order/order-item CSV export.
- Export buttons in admin Products and Orders.
- CSV helper for escaping exported values.
- Disposable seed/sample data for previewing fresh stores.
- Catalog import CSV template.
- Catalog import validator script.
- Admin CSV product import writer endpoint at `/api/admin/import/products`.
- Admin CSV import UI on the Products screen.
- XLSX product import support through the same admin import flow.
- Bulk product updates for status, category, and stock.
- Category/subcategory management screen.
- Customer export backed by the local customer rollup table.
- Product image cleanup script with dry-run by default.
- Inventory history backed by automatic variant stock-change events.

## Commands

```powershell
npm.cmd run catalog:validate-import -- docs/catalog-import-template.csv
npm.cmd run storage:cleanup-products
npm.cmd run storage:cleanup-products -- --env clients/fresh-grocery-uae/.env.local --delete
```

## Notes

The customer export is generated from the `customers` rollup table populated from new orders. Existing historical orders can be backfilled with a one-time SQL/import task before a production rollout.
