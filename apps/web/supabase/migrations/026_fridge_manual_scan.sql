-- Allow manual fridge item entry without voice/photo scan
ALTER TABLE fridge_scans DROP CONSTRAINT fridge_scans_scan_type_check;
ALTER TABLE fridge_scans ADD CONSTRAINT fridge_scans_scan_type_check 
  CHECK (scan_type IN ('voice', 'photo', 'manual'));
