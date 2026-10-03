import { z } from "zod";
import type { ZodError, ZodType } from "zod";
import { corsJson } from "@/utils/cors";
import logger from "@/utils/logger";

/**
 * Format Zod validation errors for API responses
 */
export function formatValidationErrors(
  error: ZodError,
): Record<string, Array<string>> {
  const formatted: Record<string, Array<string>> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".");
    const key = path || "_root";

    if (!formatted[key]) {
      formatted[key] = [];
    }
    formatted[key].push(issue.message);
  }

  return formatted;
}

/**
 * Validate an already parsed value against a Zod schema.
 */
export function validateData<T>(
  request: Request,
  value: unknown,
  schema: ZodType<T>,
  message = "Validation failed",
  statusCode = 400,
): { data: T; error?: never } | { data?: never; response: Response } {
  const result = schema.safeParse(value);
  if (result.success) return { data: result.data };

  logger.warn(`Validation error: ${result.error.message}`, "API:validation");
  return {
    response: corsJson(
      request,
      {
        error: true,
        message,
        details: formatValidationErrors(result.error),
      },
      { status: statusCode },
    ),
  };
}

/**
 * Validate request body against a Zod schema
 * Returns parsed data or error response
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodType<T>,
  message?: string,
  statusCode?: number,
): Promise<{ data: T; error?: never } | { data?: never; response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return {
      response: corsJson(
        request,
        { error: true, message: "Invalid request body" },
        { status: statusCode ?? 400 },
      ),
    };
  }

  return validateData(request, body, schema, message, statusCode);
}

/**
 * Validate URL search params against a Zod schema
 */
export function validateSearchParams<T>(
  request: Request,
  schema: ZodType<T>,
): { data: T; error?: never } | { data?: never; response: Response } {
  const url = new URL(request.url);
  const params: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return validateData(request, params, schema, "Invalid query parameters");
}

/**
 * Common validation schemas
 */
export const schemas = {
  id: z.string().min(1, "ID is required"),
  email: z.email("Invalid email address"),
  url: z.url("Invalid URL"),
  positiveInt: z.number().int().positive(),
  nonNegativeInt: z.number().int().min(0),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  dateString: z.coerce.date(),
  pagination: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  }),
};

/**
 * Helper to create a typed API handler with validation
 */
export function createValidatedHandler<TBody = never, TQuery = never>(options: {
  bodySchema?: ZodType<TBody>;
  querySchema?: ZodType<TQuery>;
  handler: (
    request: Request,
    context: {
      body: TBody extends never ? undefined : TBody;
      query: TQuery extends never ? undefined : TQuery;
    },
  ) => Promise<Response>;
}) {
  return async (ctx: { request: Request }) => {
    const { request } = ctx;

    // Validate body if schema provided
    let body: TBody extends never ? undefined : TBody =
      undefined as TBody extends never ? undefined : TBody;
    if (options.bodySchema) {
      const result = await validateBody(request, options.bodySchema);
      if ("response" in result) return result.response;
      body = result.data as TBody extends never ? undefined : TBody;
    }

    // Validate query if schema provided
    let query: TQuery extends never ? undefined : TQuery =
      undefined as TQuery extends never ? undefined : TQuery;
    if (options.querySchema) {
      const result = validateSearchParams(request, options.querySchema);
      if ("response" in result) return result.response;
      query = result.data as TQuery extends never ? undefined : TQuery;
    }

    return options.handler(request, { body, query });
  };
}
