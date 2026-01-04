# How NCC Images Are Stored

## Storage Flow

### 1. During ZIP Ingest (Cloudflare Worker)

When the Worker processes a ZIP file:

```
ZIP File
  └── Images/ (or Image/)
      ├── image-1.jpeg
      ├── diagram-2.png
      └── photo-3.jpg
```

The Worker:
1. **Finds the `Images/` folder** (case-insensitive search)
2. **Uploads each image to R2** with a deterministic key:
   ```
   ncc/{editionId}/{volume}/assets/{filename}
   ```
   Example: `ncc/5cb28cc7-580c-4ebf-ab49-1f72d940b192/V1/assets/image-1.jpeg`

3. **Creates `ncc_asset` records** in Supabase:
   ```sql
   INSERT INTO ncc_asset (
     ingest_run_id,
     asset_type,
     filename,
     r2_key,
     width,
     height
   ) VALUES (
     'run-id',
     'image',
     'image-1.jpeg',
     'ncc/.../assets/image-1.jpeg',
     NULL,
     NULL
   );
   ```

### 2. Linking Images to Documents

NCC XMLs reference images via **descriptor XMLs**:

```xml
<!-- In a clause XML -->
<image-reference conref="/tmp/QppServer/.../532_0.7.0.xml" />
```

The Worker:
1. **Finds the descriptor XML** (`532_0.7.0.xml`)
2. **Extracts the actual image filename** from the descriptor
3. **Matches it to the uploaded asset** by filename
4. **Creates `ncc_asset_placement`** record linking:
   - `asset_id` → the R2 image
   - `document_id` → the clause/specification
   - `block_id` → the specific paragraph/block where it appears

### 3. Rendering Images in UI

When you display a clause:

1. Query `ncc_block` for the document
2. For blocks with `block_type = 'image'`:
   ```json
   {
     "block_type": "image",
     "data": {
       "assetId": "uuid",
       "r2Key": "ncc/.../assets/image-1.jpeg",
       "filename": "image-1.jpeg"
     }
   }
   ```
3. Generate a **signed R2 URL** or use a **public URL** (if bucket is public)
4. Render `<img src={signedUrl} alt={caption} />`

## R2 Bucket Structure

```
buildsense-files/
  └── ncc/
      ├── raw/                           # Uploaded ZIPs
      │   └── {editionId}/
      │       └── {volume}/
      │           └── {uploadId}.zip
      └── {editionId}/                   # Extracted assets
          ├── V1/
          │   └── assets/
          │       ├── image-1.jpeg
          │       ├── diagram-2.png
          │       └── photo-3.jpg
          ├── V2/
          │   └── assets/
          │       └── ...
          └── V3/
              └── assets/
                  └── ...
```

## Database Schema

### `ncc_asset`
Stores metadata about each image:
- `id` (UUID)
- `ingest_run_id` (which ZIP it came from)
- `asset_type` ('image')
- `filename` ('image-1.jpeg')
- `r2_key` ('ncc/.../assets/image-1.jpeg')
- `width`, `height` (optional)

### `ncc_asset_placement`
Links images to where they appear:
- `asset_id` → which image
- `document_id` → which clause/spec
- `block_id` → which paragraph/block
- `caption` (optional)

### `ncc_block`
Render-ready blocks with image data:
```json
{
  "block_type": "image",
  "data": {
    "assetId": "...",
    "r2Key": "ncc/.../assets/image-1.jpeg",
    "filename": "image-1.jpeg"
  }
}
```

## Accessing Images

### Option 1: Presigned URLs (Private Bucket)
```typescript
import { r2Client } from "@/lib/storage/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const url = await getSignedUrl(
  r2Client,
  new GetObjectCommand({
    Bucket: "buildsense-files",
    Key: block.data.r2Key,
  }),
  { expiresIn: 3600 } // 1 hour
);
```

### Option 2: Public URLs (Public Bucket)
If you make the bucket public:
```
https://buildsense.8a1f9133decf84374f76d838936c78ff.r2.cloudflarestorage.com/ncc/.../assets/image-1.jpeg
```

### Option 3: Custom Domain
Set up a custom domain in Cloudflare R2:
```
https://assets.buildsense.com/ncc/.../assets/image-1.jpeg
```

## Summary

✅ Images are **extracted from ZIPs** and **uploaded to R2**  
✅ Each image gets a **deterministic R2 key**  
✅ Images are **linked to clauses** via `ncc_asset_placement`  
✅ UI renders images using **signed URLs** or **public URLs**  
✅ All metadata is in **Supabase** for fast queries


