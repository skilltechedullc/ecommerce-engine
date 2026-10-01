# Millco storefront refresh

Prepared 2026-10-01 on codex/millco-production.

Source reviewed: https://millco.in/ (company-owned homepage). Relevant facts used: Kerala location, fresh-coconut sourcing, controlled drying and mechanical extraction. Company-level FSSAI/HACCP/GMP information is linked rather than represented as product-specific certification. The site uses inconsistent ISO wording and describes organic/halal production options; do not label every SKU certified organic/halal without product documentation. Detailed linked product/certification pages could not be retrieved during review. No medical benefits, superiority guarantees, fabricated reviews or reference-price discounts added.

Seven illustrative listings across Coconut Oils, Cold-Pressed Oils, Honey and Pantry Essentials; 18 variants. The owner requested Wayanadan and Sidr (written Sedar in the request) honey plus traditional Ventha Velichenna; final provenance, label descriptions and spelling need owner review. Coconut oil cake was excluded because the company describes a feed/agricultural use rather than a consumer pantry item.

Sample prices, stock (25 per variant), packaging illustrations and incomplete product details are placeholders. Data is recorded in clients/millco-sample-catalog.json. The import created new listings without replacing existing products or deleting variants. Replace through admin before accepting real payments. No sale discounts were invented.

Design: ivory and green palette, serif editorial headings, existing Millco wordmark, category shortcuts, visible free-shipping threshold, product-size choices and a compact manufacturer story. All images are original SVG packaging illustrations, explicitly labelled as illustrations; they are not photos of actual packs.

Validation: lint, typecheck, secret scan; browser checks at 1440px and 390px for home, catalog, Honey filter and two product pages. Full live-payment verification remains separate.
