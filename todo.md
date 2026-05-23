# Quick Quartz — Project TODO

## Phase 1: Database Schema & Backend
- [x] Design and apply full database schema (clients, leads, quotes, orders, inventory, price lists, users)
- [x] Seed default price list templates (Standard Quartz, Premium Quartz, Slabs) with line items
- [x] Backend router: clients (CRUD, search, lead source tracking)
- [x] Backend router: quotes (CRUD, versioning, status management, salesperson assignment)
- [x] Backend router: orders (CRUD, status tracking, payment tracking)
- [x] Backend router: price lists (templates, line items, color-specific pricing)
- [x] Backend router: inventory (slab tracking, low-stock alerts)
- [x] Backend router: analytics (pipeline, revenue, conversion rates, salesperson metrics)
- [x] Backend router: admin (user management, role assignment)

## Phase 2: Global Layout & Theme
- [x] Configure global theme (slate/white palette, quartz-stone accent color)
- [x] Build AppLayout with sidebar navigation for all modules
- [x] Sidebar navigation: Dashboard, Clients, Quotes, Orders, Inventory, Price Lists, Settings
- [x] Mobile-responsive sidebar (collapsible drawer on mobile)
- [x] Top header with user profile, role badge, and logout

## Phase 3: Client & Lead Management
- [x] Client list page with search, filter by lead source, and sortable table
- [x] Client detail page: contact info, project history, notes
- [x] Create/edit client form with lead source tracking
- [x] Lead source options: Website, Phone, Referral, Walk-in, Other

## Phase 4: 2D Drawing Canvas
- [x] Canvas component with HTML5 Canvas rendering
- [x] Shape tools: Rectangle, L-shape, U-shape, custom polygon
- [x] Snap-to-grid with configurable grid size
- [x] Auto-calculation: square footage, linear edge footage
- [x] Canvas save/load (JSON serialization in quote data)
- [x] Per-shape sqft label shown on canvas; total sqft/perimeter in toolbar (full per-edge labels deferred)
- [x] Canvas state serialized as JSON; print/PDF via browser (dedicated SVG/PNG export deferred)

## Phase 5: Dynamic Pricing Engine
- [x] Price list template management (Standard Quartz, Premium Quartz, Slabs)
- [x] Color-specific material pricing (per sq ft)
- [x] Edge profile pricing (per linear ft)
- [x] Splash/backsplash pricing (per sq ft)
- [x] Accessory pricing (sink cutouts, faucet holes, etc.)
- [x] Fixture pricing (pre-configured sinks, faucets)
- [x] Ontario HST 13% automatic calculation
- [x] Quote line item builder from canvas measurements (auto-populate)
- [x] wasteFactor stored in DB per price list; applied in pricing engine calculations

## Phase 6: Quote Management
- [x] Quotes dashboard with table: Account, Quote Name, Date, Status, Revision, Price List, Salesperson
- [x] Quote status: Active, Draft, Expired
- [x] Create quote form with client selection, drawing canvas, material selection
- [x] Quote versioning and revision history (Change Log)
- [x] Quote detail view: info panel, drawing preview, itemized pricing breakdown
- [x] Email tracking: sent date, view count, last viewed timestamp
- [x] Print/PDF proposal with Quick Quartz branding (browser print)
- [x] Digital signature capture on proposal
- [x] Client approval workflow (signature + status update)

## Phase 7: Order Management
- [x] Orders dashboard with table: Account, Order Name, Sq Ft, Payment Status, Price List, Salesperson, Sale Date, Total Price
- [x] Single-click quote-to-order conversion
- [x] Project status: Pending, In Progress, Completed, Invoiced
- [x] Payment status: Unpaid, Partial, Paid
- [x] Order detail page with status management
- [x] Order detail page with print-friendly layout for invoiced orders

## Phase 8: Inventory Management
- [x] Inventory list: color, brand, thickness, quantity, location, finish
- [x] Add/edit/delete slab inventory
- [x] Low-stock alert threshold configuration
- [x] Low-stock alert badges in sidebar and inventory page
- [x] Price list item edit updates material pricing; inventory items track cost per sq ft

## Phase 9: Analytics Dashboard
- [x] Pipeline overview: total quotes, conversion rate, revenue forecast
- [x] Revenue by period (monthly) chart (Recharts)
- [x] Salesperson performance metrics table
- [x] Quote conversion rate chart
- [x] Order status breakdown chart
- [x] Analytics: revenue chart, quote/order status charts, salesperson metrics table

## Phase 10: Role-Based Access Control
- [x] Admin role: full access including price list management, user admin, analytics
- [x] Sales rep role: clients, quotes, orders, inventory view
- [x] Protected routes on frontend by role
- [x] Admin-only: user management page (view users, change roles)
- [x] Admin-only: price list management

## Phase 11: Polish & Testing
- [x] Empty states for all list pages
- [x] Loading skeletons for data-heavy pages
- [x] Error handling and toast notifications throughout
- [x] Vitest unit tests for pricing engine calculations (33 tests passing)
- [x] Vitest unit tests for HST calculation
- [x] Vitest unit tests for quote router, auth, admin, analytics, inventory
- [x] TypeScript strict check — zero errors
