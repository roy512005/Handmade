---
name: buyer-storefront
description: Requirements for the buyer-facing site — homepage, categories, listing, product page, search, wishlist, cart, checkout, account, tracking, reviews. Use when building any buyer feature.
---

# Buyer Storefront

Apply the `design-system` skill. Only approved products from approved sellers are shown.

## Header
Logo, search, Categories, Discover, Our Makers, Wishlist, Account, Cart.

## Homepage sections (keep it short)
Hero ("Not Just Products. Pieces With Stories." — CTAs: Explore Collection, Meet the Makers) → Shop by category → Trending → New arrivals → Featured artisans → Curated collections → Under ₹499/₹999 → Personalised gifts → Regional crafts → Reviews → Newsletter → Footer. All admin-manageable.

## Categories (admin-managed)
Home Décor, Handmade Jewellery, Art and Paintings, Pottery and Ceramics, Handmade Textiles, Bags and Accessories, Personalised Gifts, Traditional Indian Crafts, Wooden Crafts, Handmade Lifestyle.

## Listing
Grid; filters: category, price, availability, material, product type; sort: newest, price, popularity, rating; pagination/infinite load.
Card: image, name, price, original price + discount %, maker, wishlist, rating, custom-made badge.

## Product page
Gallery, title, price/original, description, materials, dimensions, weight, colour variants, stock, handmade/custom info, processing time, est. delivery, shipping charge, seller info, reviews, return policy, related. Actions: add to cart, buy now, wishlist, share. Custom products show options + preparation time.

## Search
Product/category/seller search, suggestions, recent terms, popular searches, no-results recommendations. Later: material/craft/region/style.

## Wishlist & Cart
Wishlist: add/remove/view/move to cart. Cart: qty, remove, save for later, shipping estimate, coupon, subtotal, total. Multi-seller cart allowed; checkout splits into seller suborders. Server revalidates price and stock.

## Checkout
Login or guest → address → review → shipping → coupon → payment method → confirm. Methods follow the approved gateway (UPI, cards, net banking; COD only if feasible).

## Account
Overview, orders, order details, shipment tracking, wishlist, addresses, reviews, notifications, profile, support, logout.

## Reviews
1–5 rating, text, photos, date. "Verified buyer" only for real purchases.

## Tracking statuses
Order placed, payment confirmed, seller preparing, ready for pickup, picked up, in transit, out for delivery, delivered; plus cancellation requested, cancelled, return requested/in progress, refunded, delivery failed. See `order-workflow`.
