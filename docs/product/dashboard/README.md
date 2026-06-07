# Dashboard References

These images are visual references only. They are not implementation plans.

## Current References

- `ecommerce-promotion-cockpit-dashboard.png` is the current live app dashboard screenshot used in the README.
- `products-dashboard-clean.png` is the accepted first-page dashboard: page body, top metrics, product sales table, promotion suggestion button, and disabled create action.
- `products-dashboard-codex-popup.png` is the accepted first-page popup state after generating promotion suggestions. The implemented dashboard now also exposes each suggestion through a row-level `View recommendation` popup.
- `product-detail-campaign-history.png` is the accepted product detail and campaign history direction.
- `campaign-create-scrollable.png` is the accepted campaign create/view direction: scrollable setup, campaign details below, custom image prompt, aspect ratio control, and a simple campaign creative gallery.

## Older Explorations

- `simple-products-dashboard-01.png`, `simple-products-dashboard-02.png`, `simple-products-dashboard-03.png`, and `products-campaign-flow-popup.png` are earlier explorations. Keep them for context, but use the four accepted references above for implementation.

## Notes

- The real first page should not include the generated image's top header navigation or user icon.
- Suggested product rows should expose `View recommendation`; the popup should explain why the product was picked, show recommended offer terms, and include `Create campaign`.
- Suggestion and recommendation popups should close when the user clicks outside them.
- The campaign setup fields belong on the campaign create page, not directly on the products page.
- The campaign create/view page should be vertically scrollable, and campaign creative should appear in a simple image gallery.
- Product images in these mockups are illustrative only. The current product model does not include product thumbnails.
