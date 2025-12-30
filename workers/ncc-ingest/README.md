## NCC ingest Worker (Cloudflare Queue + R2)

This Worker consumes Cloudflare Queue messages to ingest NCC ZIP uploads:
- downloads ZIP from R2
- finds `XML/` and `Images/` folders inside the ZIP (any depth)
- two-pass ingest into Supabase tables:
  - `ncc_ingest_run`, `ncc_xml_object`, `ncc_document`, `ncc_block`, `ncc_reference`, `ncc_asset`, `ncc_asset_placement`

### Endpoints
- `POST /enqueue` (authenticated): enqueue `{ ingestRunId }` into the queue.

### Required bindings / env
- **Queue** binding: `NCC_INGEST_QUEUE`
- **R2** bucket binding: `R2_BUCKET`
- **Env vars**:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ENQUEUE_TOKEN` (Bearer token for `/enqueue`)

### Deploy
From this directory:

```bash
npx wrangler deploy
```


