# Supabase Storage Setup

The document upload is failing because the Supabase storage bucket doesn't exist yet.

## Quick Setup Steps

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project: `gzfzcrecyhmtbuefyvtr`

2. **Create Storage Bucket**
   - Click on **Storage** in the left sidebar
   - Click **New bucket**
   - Settings:
     - **Name**: `documents`
     - **Public bucket**: Toggle ON (so files can be accessed)
     - Click **Create bucket**

3. **Set Bucket Policies (Important!)**

   After creating the bucket, click on the `documents` bucket, then click **Policies**.

   Click **New policy** and add these policies:

   ### Policy 1: Allow Authenticated Users to Upload
   ```sql
   CREATE POLICY "Authenticated users can upload documents"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'documents');
   ```

   ### Policy 2: Allow Public Read Access
   ```sql
   CREATE POLICY "Public read access for documents"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'documents');
   ```

   ### Policy 3: Allow Authenticated Users to Update
   ```sql
   CREATE POLICY "Authenticated users can update their documents"
   ON storage.objects FOR UPDATE
   TO authenticated
   USING (bucket_id = 'documents');
   ```

   ### Policy 4: Allow Authenticated Users to Delete
   ```sql
   CREATE POLICY "Authenticated users can delete their documents"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (bucket_id = 'documents');
   ```

4. **Verify Setup**
   - Go back to Storage → documents bucket
   - You should see it's public and has policies configured
   - Try uploading a document in your production app

## Alternative: Use Service Role for Admin Access

If you want to bypass RLS policies and use service role key (already configured in your app):

1. Go to Storage → documents bucket → Policies
2. Add this policy:

```sql
CREATE POLICY "Service role has full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'documents');
```

Your app uses `SUPABASE_SERVICE_ROLE_KEY` which has admin access, so this should allow uploads without authentication issues.

## Troubleshooting

If uploads still fail:
1. Check Vercel environment variables:
   ```bash
   vercel env ls production | grep SUPABASE
   ```

   Make sure these are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Check bucket exists:
   - Go to Supabase Dashboard → Storage
   - Verify `documents` bucket is listed

3. Check logs in Vercel for specific error:
   - The upload route should log Supabase errors
   - Look for "Supabase upload error details" in logs
