import { NextRequest } from "next/server";
import z from "zod";

import type { UploadType } from "@/utils/image-storage";
import { corsJson } from "@/utils/cors";
import { requireApiAuth } from "@/utils/api";
import logger from "@/utils/logger";
import { validateBody } from "@/utils/validation";
import {
  ALLOWED_MIME_TYPES,
  ImageStorageError,
  MAX_RAW_FILE_SIZE,
  UPLOAD_TYPES,
  detectImageMime,
  saveImage,
} from "@/utils/image-storage";

const typeSizeLimits: Record<UploadType, number> = {
  notes: 10 * 1024 * 1024, // 10 MB
  avatars: 5 * 1024 * 1024, // 5 MB
  drawings: 5 * 1024 * 1024, // 5 MB
};

const fileSchema = z
  .file()
  .max(
    MAX_RAW_FILE_SIZE,
    `File must be < ${MAX_RAW_FILE_SIZE / 1024 / 1024} MB`,
  )
  .mime(ALLOWED_MIME_TYPES as unknown as [string, ...Array<string>]);
const jsonUploadSchema = z.object({
  image: z.string().optional(),
  type: z.string().optional(),
  mimeType: z.string().optional(),
});

async function parseUploadRequest(request: Request): Promise<{
  file: File | null;
  typeParam: string;
} | { response: Response }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.toLowerCase().includes("application/json")) {
    const validated = await validateBody(request, jsonUploadSchema);
    if ("response" in validated) return validated;
    const body = validated.data;

    const typeParam = body.type ?? "notes";
    const mimeType = body.mimeType;
    const base64 = body.image ?? "";

    // Accept a raw base64 payload or a `data:<mime>;base64,<data>` URL.
    const dataUrl = /^data:[^;,]+;base64,(.+)$/s.exec(base64);
    const rawBase64 = (dataUrl?.[1] ?? base64).replace(/\s+/g, "");

    const buffer = Buffer.from(rawBase64, "base64");
    const file = new File([new Uint8Array(buffer)], "mobile-upload", {
      // Prefer bytes over the client's claim; `saveImage` re-validates anyway.
      type:
        detectImageMime(new Uint8Array(buffer)) ??
        mimeType ??
        "application/octet-stream",
    });

    return { file, typeParam };
  }

  const formData = await request.formData();
  const file = (formData.get("image") as File | null) ?? null;
  const typeParam = (formData.get("type") as string | null) ?? "notes";
  return { file, typeParam };
}

export const POST = async (request: NextRequest) => {
  const { response } = await requireApiAuth(request);
  if (response) return response;

  try {
    const parsedUpload = await parseUploadRequest(request);
    if ("response" in parsedUpload) return parsedUpload.response;
    const { file, typeParam } = parsedUpload;

    // Validate upload type
    if (!UPLOAD_TYPES.includes(typeParam as UploadType)) {
      return corsJson(
        request,
        {
          success: false,
          errors: `Invalid upload type. Must be one of: ${UPLOAD_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const uploadType = typeParam as UploadType;

    // 1. Validate file type and size
    const validatedFile = fileSchema.parse(file);
    const sizeLimit = typeSizeLimits[uploadType];

    if (validatedFile.size > sizeLimit) {
      return corsJson(
        request,
        {
          success: false,
          errors: `File too large for ${uploadType}. Maximum size: ${(sizeLimit / 1024 / 1024).toFixed(0)} MB`,
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await validatedFile.arrayBuffer());

    // 2. Save and optimize image
    const result = await saveImage({
      buffer,
      originalName: validatedFile.name,
      type: uploadType,
    });

    logger.info(
      `Image uploaded: ${result.url} (${(result.size / 1024).toFixed(1)} KB, ${result.width}x${result.height})`,
      "API:upload",
    );

    // 3. Return image metadata
    return corsJson(
      request,
      {
        success: true,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        filename: result.url.split("/").pop(),
        size: result.size,
        mime: result.mime,
        width: result.width,
        height: result.height,
        type: uploadType,
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof SyntaxError) {
      return corsJson(
        request,
        { success: false, errors: "Invalid JSON body" },
        { status: 400 },
      );
    }

    if (err instanceof z.ZodError) {
      return corsJson(
        request,
        {
          success: false,
          errors: err.issues[0]?.message ?? "Validation error",
        },
        { status: 400 },
      );
    }

    if (err instanceof ImageStorageError) {
      return corsJson(
        request,
        { success: false, errors: err.message },
        { status: 400 },
      );
    }

    logger.error("Image upload failed", err, "API:upload");
    return corsJson(
      request,
      { success: false, message: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
};
