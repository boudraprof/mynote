import { NextRequest } from "next/server";

import { requireApiAuth } from "@/utils/api";
import { UPLOAD_TYPES } from "@/utils/image-storage";
import { readImage } from "@/utils/image-storage-local";
import { validateData } from "@/utils/validation";
import { z } from "zod";

const uploadPathSchema = z
  .array(z.string().min(1))
  .min(1)
  .refine((segments) => UPLOAD_TYPES.some((type) => type === segments[0]))
  .refine(
    (segments) =>
      !segments.some((segment) => segment === ".." || segment.includes("/")),
  );

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) => {
  const { response } = await requireApiAuth(request);
  if (response) return response;

  const { path } = await params;
  const validated = validateData(
    request,
    path,
    uploadPathSchema,
    "Not Found",
    404,
  );
  if ("response" in validated) return validated.response;

  const image = await readImage(`/uploads/${validated.data.join("/")}`);
  if (!image) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(new Uint8Array(image.buffer), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
