import type { Order, OrderStatus } from "../shared/order.types.js";
import { getPool } from "./pool.js";

function mapRow(row: {
  id: string;
  status: string;
  product_id: number | null;
  created_at: Date;
  updated_at: Date;
}): Order {
  return {
    id: row.id,
    status: row.status as OrderStatus,
    productId: row.product_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function findOrderById(id: string): Promise<Order | null> {
  const result = await getPool().query(
    `SELECT id, status, product_id, created_at, updated_at FROM orders WHERE id = $1`,
    [id],
  );
  if (result.rowCount === 0) return null;
  return mapRow(result.rows[0]);
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order | null> {
  const result = await getPool().query(
    `
    UPDATE orders SET status = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id, status, product_id, created_at, updated_at
  `,
    [id, status],
  );
  if (result.rowCount === 0) return null;
  return mapRow(result.rows[0]);
}
