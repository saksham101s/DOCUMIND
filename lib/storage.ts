import { createClient } from "@supabase/supabase-js";

const BUCKET = "documents";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key);
}

/** Upload raw file bytes to Supabase Storage and return the public URL path. */
export async function uploadDocumentFile(
  userId: string,
  documentId: string,
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const supabase = getSupabase();
  const safeName = filename.replace(/[^\w.\-()]/g, "_");
  const path = `${userId}/${documentId}/${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Remove all files under a document prefix (best-effort). */
export async function deleteDocumentFiles(
  userId: string,
  documentId: string,
): Promise<void> {
  const supabase = getSupabase();
  const prefix = `${userId}/${documentId}`;

  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(prefix);

  if (listError || !files?.length) return;

  const paths = files.map((f) => `${prefix}/${f.name}`);
  await supabase.storage.from(BUCKET).remove(paths);
}
