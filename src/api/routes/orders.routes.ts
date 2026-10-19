import { Router } from "express";
import * as ordersController from "../controllers/orders.controller.js";

export const ordersRouter = Router();

/**
 * @openapi
 * /orders/{orderId}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order by id
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order found
 *       404:
 *         description: Order not found
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal error
 */
ordersRouter.get("/:orderId", (req, res, next) => {
  ordersController.getOrder(req, res).catch(next);
});

/**
 * @openapi
 * /orders/{orderId}/cancellation:
 *   post:
 *     tags: [Orders]
 *     summary: Request order cancellation
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cancellation succeeded
 *       404:
 *         description: Order not found
 *       409:
 *         description: Order not cancellable
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal error
 */
ordersRouter.post("/:orderId/cancellation", (req, res, next) => {
  ordersController.cancelOrder(req, res).catch(next);
});
