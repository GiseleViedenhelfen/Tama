import "dotenv/config";
import { getPool, closePool } from "./pool.js";

const seeds = [
  { id: "1001", status: "processing", productId: 1 },
  { id: "1002", status: "shipped", productId: 2 },
  { id: "1003", status: "delivered", productId: 3 },
  { id: "1004", status: "cancelled", productId: 4 },
] as const;

async function seed(): Promise<void> {
  const pool = getPool();
  for (const row of seeds) {
    await pool.query(
      `
      INSERT INTO orders (id, status, product_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        product_id = EXCLUDED.product_id,
        updated_at = NOW()
    `,
      [row.id, row.status, row.productId],
    );
  }
  console.log(`Seeded ${seeds.length} orders`);
}

seed()
  .then(() => closePool())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
