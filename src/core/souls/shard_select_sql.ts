// GROUP_CONCAT-based SELECT that resolves shard → soul_ids in a single query
export const SHARD_SELECT_WITH_SOULS = `
  SELECT s.*, GROUP_CONCAT(ss.soul_id) AS soul_ids
  FROM soul_shards s
  LEFT JOIN shard_souls ss ON ss.shard_id = s.id`;
