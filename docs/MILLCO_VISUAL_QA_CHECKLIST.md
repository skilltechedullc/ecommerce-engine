# Millco Visual QA Checklist

Use this checklist after major engine changes and before deploying changes that affect `shop.millco.in`.

## Storefront

- [ ] Homepage loads without layout shifts or broken images.
- [ ] Header navigation works on desktop and mobile.
- [ ] Footer links and legal links work.
- [ ] Product listing page loads active products.
- [ ] Category filters work.
- [ ] Sorting works.
- [ ] Product cards show correct image, price, stock state, and CTA.
- [ ] Product detail page loads gallery, variant selector, price, stock, and add-to-cart.
- [ ] Related products and category links work.

## Cart And Checkout

- [ ] Add to cart works from product card.
- [ ] Add to cart works from product detail page.
- [ ] Mini cart opens and updates.
- [ ] Cart page shows correct quantities and totals.
- [ ] Quantity increment/decrement works.
- [ ] Remove item works.
- [ ] Checkout form validates name, email, phone, and address.
- [ ] Razorpay test checkout opens in test mode.
- [ ] Failed/dismissed payment returns to a usable state.
- [ ] Successful payment creates exactly one order.
- [ ] Success page shows safe confirmation details.

## Admin

- [ ] Admin login works.
- [ ] Admin dashboard loads.
- [ ] Product list loads.
- [ ] New product creation works.
- [ ] Product edit works.
- [ ] Product image upload works in the test environment.
- [ ] Product active/inactive state behaves correctly.
- [ ] Order list loads.
- [ ] Order detail loads.
- [ ] Order status update works.
- [ ] Shipment creation works in manual/test mode.
- [ ] Notification logs display correctly.

## Notifications And Integrations

- [ ] Customer email sends in test/dev mode.
- [ ] Admin email sends in test/dev mode.
- [ ] WhatsApp contact links open correctly.
- [ ] WhatsApp automation remains disabled unless explicitly testing it.
- [ ] AI chat remains disabled unless explicitly testing it.
- [ ] Shipping provider remains `manual` unless explicitly testing a provider.

## Mobile

- [ ] Homepage is usable on mobile.
- [ ] Product listing is usable on mobile.
- [ ] Product detail gallery and sticky cart controls do not overlap content.
- [ ] Cart mobile sticky checkout is usable.
- [ ] Checkout mobile sticky pay button is usable.
- [ ] Admin pages remain usable enough for basic operations on tablet/mobile.

## Post-Deploy Smoke Test

- [ ] Visit `https://shop.millco.in/`.
- [ ] Open a product page.
- [ ] Add a product to cart.
- [ ] Open cart.
- [ ] Open checkout.
- [ ] Confirm admin login page loads.
- [ ] Confirm no obvious production errors appear in hosting logs.

