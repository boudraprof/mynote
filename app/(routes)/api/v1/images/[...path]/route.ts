import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/utils/api";
import { UPLOAD_TYPES } from "@/utils/image-storage";
import { readImage } from "@/utils/image-storage-local";
import { validateData } from "@/utils/validation";

const imagePathSchema = z
  .array(z.string().min(1))
  .min(1)
  .refine(
    (segments) =>
      !segments.some((segment) => segment === ".." || segment.includes("/")),
  )
  .refine(
    (segments) =>
      segments[0] !== "uploads" ||
      (segments.length >= 2 &&
        UPLOAD_TYPES.some((type) => type === segments[1])),
  );

const CACHE_CONTROL = "private, max-age=86400";

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) => {
  const auth = await requireApiAuth(request);
  if (auth.response) return auth.response;

  const { path } = await params;
  const validated = validateData(request, path, imagePathSchema, "Not Found", 404);
  if ("response" in validated) return validated.response;

  const segments = validated.data;

  // Local-storage backend
  if (segments[0] === "uploads") {
    const image = await readImage(
      `/uploads/${segments.slice(1).join("/")}`,
    );
    if (!image) return new Response("Not Found", { status: 404 });

    return new Response(new Uint8Array(image.buffer), {
      headers: {
        "Content-Type": image.mime,
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }

  // ImageKit backend — fetch upstream server-side (through the configured
  // proxy when required) so the endpoint stays hidden from the client.
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!endpoint) return new Response("Not Found", { status: 404 });

  const publicId = segments.join("/");
  const tr = request.nextUrl.searchParams.get("tr");
  const upstream = `${endpoint}/${publicId}${tr ? `?tr=${tr}` : ""}`;

  let response: Response;
  try {
    response = await fetch(upstream, {
      // The local network proxy can take a while to establish the tunnel;
      // undici's default connect timeout (10s) is too short.
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    console.error("Image proxy fetch failed", error);
    return new Response("Gateway Error", { status: 502 });
  }

  if (!response.ok || !response.body) {
    return new Response(
      "Not Found",
      { status: response.status === 404 ? 404 : 502 },
    );
  }

  return new Response(response.body, {
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": CACHE_CONTROL,
    },
  });
};