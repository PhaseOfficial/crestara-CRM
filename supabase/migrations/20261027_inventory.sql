-- ============================================================================
-- Migration: 20261027_inventory.sql
-- Description: Inventory table, stock settings in business_settings, RLS policies,
--              and media storage support for items.
-- ============================================================================

-- 1. Extend Business Settings with Stock Management Configurations
ALTER TABLE public.business_settings 
  ADD COLUMN IF NOT EXISTS auto_deduct_inventory BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_low_stock_threshold INTEGER NOT NULL DEFAULT 5;

-- 2. Create the Inventory / Products & Services Master Table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  type TEXT NOT NULL CHECK (type IN ('Product', 'Service')) DEFAULT 'Product',
  unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  track_stock BOOLEAN NOT NULL DEFAULT true,
  quantity_in_stock NUMERIC(15, 2) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(15, 2) NOT NULL DEFAULT 5,
  image_url TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('Active', 'Archived', 'Draft')) DEFAULT 'Active',
  barcode TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_code ON public.inventory(code);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON public.inventory(type);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON public.inventory(created_at DESC);

-- Automatic Updated At Trigger
CREATE OR REPLACE FUNCTION public.handle_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory;
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inventory_updated_at();

-- 3. Row-Level Security (RLS) Policies
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (Staff and Admins) full CRUD access
DROP POLICY IF EXISTS "Allow authenticated full access to inventory" ON public.inventory;
CREATE POLICY "Allow authenticated full access to inventory"
  ON public.inventory FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users read access (e.g. for customer invoice/quote views)
DROP POLICY IF EXISTS "Allow anon read inventory" ON public.inventory;
CREATE POLICY "Allow anon read inventory"
  ON public.inventory FOR SELECT
  TO anon
  USING (true);

-- 4. Initial Baseline Catalog Seed
INSERT INTO public.inventory (code, name, description, category, type, unit_price, cost_price, track_stock, quantity_in_stock, low_stock_threshold, status)
VALUES 
  ('SRV-CONSULT', 'Cloud Infrastructure & Security Advisory', 'High-level cloud architecture, compliance, and systems security consulting.', 'Consulting', 'Service', 180.00, 75.00, false, 0, 0, 'Active'),
  ('SRV-SUPPORT', '24/7 Managed Server & Database SLA', 'Round-the-clock proactive monitoring, incident triage, and automated patch management.', 'Managed Services', 'Service', 450.00, 150.00, false, 0, 0, 'Active'),
  ('PRD-ROUTER-01', 'Enterprise Edge Security Gateway', '10Gbps managed hardware security firewall with redundant power and dual WAN failover.', 'Hardware', 'Product', 1250.00, 820.00, true, 14, 5, 'Active'),
  ('PRD-SWITCH-48', '48-Port PoE+ Managed Gigabit Switch', 'Layer 3 enterprise rackmount switch with 4x 10G SFP+ uplinks.', 'Hardware', 'Product', 680.00, 420.00, true, 8, 3, 'Active'),
  ('PRD-FIBER-SFP', '10GBASE-SR SFP+ Optical Transceiver', 'Multimode 850nm LC optical transceiver module for rack uplinks.', 'Accessories', 'Product', 45.00, 18.00, true, 2, 10, 'Active')
ON CONFLICT (code) DO NOTHING;
