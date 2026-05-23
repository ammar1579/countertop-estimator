-- Quick Quartz — Seed Data for Local Development
-- Run AFTER applying all migrations:
--   mysql -u root -p quickquartz < seed.sql
--
-- This inserts the three default price lists (Standard Quartz, Premium Quartz, Slabs)
-- with representative line items for each category.
-- Prices are in CAD and represent typical Ontario market rates.

-- ─── Price Lists ──────────────────────────────────────────────────────────────
INSERT INTO priceLists (id, name, description, revision, isActive, wasteFactor, taxRate) VALUES
(1, 'Standard Quartz', 'Entry-level quartz colors. Ideal for rental properties and budget-conscious projects.', 1, true, 0.0800, 0.1300),
(2, 'Premium Quartz', 'Designer and high-demand quartz colors. Calacatta, Statuario, and specialty finishes.', 1, true, 0.0800, 0.1300),
(3, 'Slabs', 'Full-slab natural stone and engineered stone. Priced per slab or per square foot for custom cuts.', 1, true, 0.1000, 0.1300);

-- ─── Standard Quartz Items ────────────────────────────────────────────────────
-- Materials
INSERT INTO priceListItems (priceListId, category, name, brand, colorCode, unit, pricePerUnit, isActive, sortOrder) VALUES
(1, 'material', 'Arctic White', 'Silestone', 'SW-001', 'sqft', 45.00, true, 1),
(1, 'material', 'Blanco City', 'Silestone', 'SW-002', 'sqft', 47.00, true, 2),
(1, 'material', 'Cemento Spa', 'Silestone', 'SW-003', 'sqft', 48.00, true, 3),
(1, 'material', 'Lyra', 'Caesarstone', 'CS-001', 'sqft', 46.00, true, 4),
(1, 'material', 'Cloudburst Concrete', 'Caesarstone', 'CS-002', 'sqft', 49.00, true, 5),
(1, 'material', 'Pure White', 'MSI', 'MSI-001', 'sqft', 44.00, true, 6),
(1, 'material', 'Calacatta Laza', 'MSI', 'MSI-002', 'sqft', 52.00, true, 7),
(1, 'material', 'White Attica', 'Vicostone', 'VC-001', 'sqft', 50.00, true, 8);

-- Edge Profiles
INSERT INTO priceListItems (priceListId, category, name, unit, pricePerUnit, isActive, sortOrder) VALUES
(1, 'edge', 'Eased Edge', 'linft', 0.00, true, 10),
(1, 'edge', 'Beveled Edge (1/8")', 'linft', 8.00, true, 11),
(1, 'edge', 'Bullnose Edge', 'linft', 12.00, true, 12),
(1, 'edge', 'Ogee Edge', 'linft', 18.00, true, 13),
(1, 'edge', 'Waterfall Edge (per side)', 'linft', 45.00, true, 14),
(1, 'edge', 'Mitered Edge', 'linft', 35.00, true, 15);

-- Splash / Backsplash
INSERT INTO priceListItems (priceListId, category, name, unit, pricePerUnit, isActive, sortOrder) VALUES
(1, 'splash', '4" Backsplash', 'linft', 18.00, true, 20),
(1, 'splash', 'Full-Height Backsplash (to cabinets)', 'sqft', 45.00, true, 21),
(1, 'splash', 'Window Sill', 'linft', 22.00, true, 22);

-- Accessories
INSERT INTO priceListItems (priceListId, category, name, unit, pricePerUnit, isActive, sortOrder) VALUES
(1, 'accessory', 'Undermount Sink Cutout', 'each', 150.00, true, 30),
(1, 'accessory', 'Overmount Sink Cutout', 'each', 100.00, true, 31),
(1, 'accessory', 'Faucet Hole', 'each', 35.00, true, 32),
(1, 'accessory', 'Soap Dispenser Hole', 'each', 35.00, true, 33),
(1, 'accessory', 'Cooktop Cutout', 'each', 175.00, true, 34),
(1, 'accessory', 'Seam (per seam)', 'each', 75.00, true, 35),
(1, 'accessory', 'Notch / Cutout (custom)', 'each', 85.00, true, 36);

-- Fixtures
INSERT INTO priceListItems (priceListId, category, name, unit, pricePerUnit, isActive, sortOrder) VALUES
(1, 'fixture', 'Standard Undermount Sink (supplied)', 'each', 225.00, true, 40),
(1, 'fixture', 'Double Bowl Undermount Sink (supplied)', 'each', 350.00, true, 41),
(1, 'fixture', 'Removal & Disposal of Old Countertop', 'each', 125.00, true, 42),
(1, 'fixture', 'Installation Labour (per sqft)', 'sqft', 15.00, true, 43);

-- ─── Premium Quartz Items ─────────────────────────────────────────────────────
-- Materials
INSERT INTO priceListItems (priceListId, category, name, brand, colorCode, unit, pricePerUnit, isActive, sortOrder) VALUES
(2, 'material', 'Calacatta Gold', 'Caesarstone', 'CS-CG01', 'sqft', 85.00, true, 1),
(2, 'material', 'Statuario Maximus', 'Caesarstone', 'CS-SM01', 'sqft', 90.00, true, 2),
(2, 'material', 'White Macaubas', 'Silestone', 'SL-WM01', 'sqft', 88.00, true, 3),
(2, 'material', 'Calacatta Nuvo', 'MSI', 'MSI-CN01', 'sqft', 82.00, true, 4),
(2, 'material', 'Eternal Calacatta Gold', 'Silestone', 'SL-ECG1', 'sqft', 95.00, true, 5),
(2, 'material', 'Empira White', 'Caesarstone', 'CS-EW01', 'sqft', 78.00, true, 6),
(2, 'material', 'Bianco Drift', 'Cambria', 'CB-BD01', 'sqft', 92.00, true, 7),
(2, 'material', 'Brittanicca', 'Cambria', 'CB-BR01', 'sqft', 95.00, true, 8),
(2, 'material', 'Montserrat', 'Cambria', 'CB-MT01', 'sqft', 98.00, true, 9);

-- Edge Profiles (same structure, slightly higher pricing)
INSERT INTO priceListItems (priceListId, category, name, unit, pricePerUnit, isActive, sortOrder) VALUES
(2, 'edge', 'Eased Edge', 'linft', 0.00, true, 10),
(2, 'edge', 'Beveled Edge (1/8")', 'linft', 10.00, true, 11),
(2, 'edge', 'Bullnose Edge', 'linft', 15.00, true, 12),
(2, 'edge', 'Ogee Edge', 'linft', 22.00, true, 13),
(2, 'edge', 'Waterfall Edge (per side)', 'linft', 55.00, true, 14),
(2, 'edge', 'Mitered Edge', 'linft', 42.00, true, 15),
(2, 'edge', 'Dupont Edge', 'linft', 20.00, true, 16);

-- Splash / Backsplash
INSERT INTO priceListItems (priceListId, category, name, unit, pricePerUnit, isActive, sortOrder) VALUES
(2, 'splash', '4" Backsplash', 'linft', 22.00, true, 20),
(2, 'splash', 'Full-Height Backsplash (to cabinets)', 'sqft', 82.00, true, 21),
(2, 'splash', 'Window Sill', 'linft', 28.00, true, 22);

-- Accessories
INSERT INTO priceListItems (priceListId, category, name, unit, pricePerUnit, isActive, sortOrder) VALUES
(2, 'accessory', 'Undermount Sink Cutout', 'each', 175.00, true, 30),
(2, 'accessory', 'Overmount Sink Cutout', 'each', 125.00, true, 31),
(2, 'accessory', 'Faucet Hole', 'each', 40.00, true, 32),
(2, 'accessory', 'Soap Dispenser Hole', 'each', 40.00, true, 33),
(2, 'accessory', 'Cooktop Cutout', 'each', 200.00, true, 34),
(2, 'accessory', 'Seam (per seam)', 'each', 85.00, true, 35),
(2, 'accessory', 'Notch / Cutout (custom)', 'each', 95.00, true, 36);

-- Fixtures
INSERT INTO priceListItems (priceListId, category, name, unit, pricePerUnit, isActive, sortOrder) VALUES
(2, 'fixture', 'Premium Undermount Sink (supplied)', 'each', 350.00, true, 40),
(2, 'fixture', 'Farmhouse Sink Cutout & Supply', 'each', 550.00, true, 41),
(2, 'fixture', 'Removal & Disposal of Old Countertop', 'each', 125.00, true, 42),
(2, 'fixture', 'Installation Labour (per sqft)', 'sqft', 18.00, true, 43);

-- ─── Slabs Items ──────────────────────────────────────────────────────────────
-- Materials (priced per sqft from a full slab)
INSERT INTO priceListItems (priceListId, category, name, brand, colorCode, unit, pricePerUnit, isActive, sortOrder) VALUES
(3, 'material', 'Carrara Marble', 'Natural Stone', 'NS-CM01', 'sqft', 145.00, true, 1),
(3, 'material', 'Calacatta Marble', 'Natural Stone', 'NS-CM02', 'sqft', 175.00, true, 2),
(3, 'material', 'Black Galaxy Granite', 'Natural Stone', 'NS-BG01', 'sqft', 120.00, true, 3),
(3, 'material', 'White Ice Granite', 'Natural Stone', 'NS-WI01', 'sqft', 110.00, true, 4),
(3, 'material', 'Quartzite Super White', 'Natural Stone', 'NS-QSW1', 'sqft', 165.00, true, 5),
(3, 'material', 'Leathered Quartzite', 'Natural Stone', 'NS-LQ01', 'sqft', 180.00, true, 6),
(3, 'material', 'Porcelain Ultra-Compact (12mm)', 'Dekton', 'DK-001', 'sqft', 135.00, true, 7),
(3, 'material', 'Porcelain Ultra-Compact (20mm)', 'Dekton', 'DK-002', 'sqft', 155.00, true, 8);

-- Edge Profiles (premium for natural stone)
INSERT INTO priceListItems (priceListId, category, name, unit, pricePerUnit, isActive, sortOrder) VALUES
(3, 'edge', 'Eased Edge', 'linft', 0.00, true, 10),
(3, 'edge', 'Beveled Edge (1/8")', 'linft', 12.00, true, 11),
(3, 'edge', 'Bullnose Edge', 'linft', 18.00, true, 12),
(3, 'edge', 'Ogee Edge', 'linft', 28.00, true, 13),
(3, 'edge', 'Waterfall Edge (per side)', 'linft', 65.00, true, 14),
(3, 'edge', 'Mitered Edge', 'linft', 50.00, true, 15),
(3, 'edge', 'Leathered / Honed Finish Upcharge', 'linft', 15.00, true, 16);

-- Splash / Backsplash
INSERT INTO priceListItems (priceListId, category, name, unit, pricePerUnit, isActive, sortOrder) VALUES
(3, 'splash', '4" Backsplash', 'linft', 28.00, true, 20),
(3, 'splash', 'Full-Height Backsplash (to cabinets)', 'sqft', 145.00, true, 21),
(3, 'splash', 'Window Sill', 'linft', 35.00, true, 22);

-- Accessories
INSERT INTO priceListItems (priceListId, category, name, unit, pricePerUnit, isActive, sortOrder) VALUES
(3, 'accessory', 'Undermount Sink Cutout', 'each', 200.00, true, 30),
(3, 'accessory', 'Overmount Sink Cutout', 'each', 150.00, true, 31),
(3, 'accessory', 'Faucet Hole', 'each', 45.00, true, 32),
(3, 'accessory', 'Soap Dispenser Hole', 'each', 45.00, true, 33),
(3, 'accessory', 'Cooktop Cutout', 'each', 225.00, true, 34),
(3, 'accessory', 'Seam (per seam)', 'each', 100.00, true, 35),
(3, 'accessory', 'Notch / Cutout (custom)', 'each', 110.00, true, 36);

-- Fixtures
INSERT INTO priceListItems (priceListId, category, name, unit, pricePerUnit, isActive, sortOrder) VALUES
(3, 'fixture', 'Premium Undermount Sink (supplied)', 'each', 400.00, true, 40),
(3, 'fixture', 'Farmhouse Apron Sink Cutout & Supply', 'each', 650.00, true, 41),
(3, 'fixture', 'Removal & Disposal of Old Countertop', 'each', 150.00, true, 42),
(3, 'fixture', 'Installation Labour — Natural Stone (per sqft)', 'sqft', 22.00, true, 43),
(3, 'fixture', 'Sealing — Natural Stone (per sqft)', 'sqft', 5.00, true, 44);
