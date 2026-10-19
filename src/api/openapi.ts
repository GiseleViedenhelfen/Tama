import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Tama Main API",
      version: "1.0.0",
      description:
        "Order lookup and cancellation API for the secure support agent challenge.",
    },
    servers: [{ url: "http://localhost:3000", description: "Local" }],
    components: {
      schemas: {
        Order: {
          type: "object",
          properties: {
            id: { type: "string" },
            status: {
              type: "string",
              enum: ["processing", "shipped", "delivered", "cancelled"],
            },
            productId: { type: "integer", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ApiResult: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            code: { type: "string" },
            message: { type: "string" },
            data: { $ref: "#/components/schemas/Order" },
          },
        },
      },
    },
  },
  apis: ["./src/api/routes/*.ts", "./dist/api/routes/*.js"],
});
