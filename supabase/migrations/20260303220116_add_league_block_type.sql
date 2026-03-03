ALTER TABLE blocks DROP CONSTRAINT blocks_block_type_check;
ALTER TABLE blocks ADD CONSTRAINT blocks_block_type_check
  CHECK (block_type IN ('lesson', 'clinic', 'maintenance', 'wet', 'league', 'other'));
