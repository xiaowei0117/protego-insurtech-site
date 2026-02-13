# FAISS Operations Guide (Local Docker)

This guide centralizes the commands and workflows to manage the local FAISS service used by the `carrier-assistant-faiss` route.

## 1) Prerequisites
- Docker Desktop is running
- FAISS service code exists at:
  - `C:\Users\xiaow\projects\insurance-platform\faiss-service`
- App env has:
  - `FAISS_URL=http://localhost:8000`
  - `OLLAMA_HOST=http://localhost:11434`
  - `EMBEDDING_MODEL=nomic-embed-text`
  - `LLM_MODEL=llama3.1:8b`

## 2) Docker Commands
```powershell
# Go to FAISS service folder
cd C:\Users\xiaow\projects\insurance-platform\faiss-service

# Build image
docker build -t faiss-service .

# Start in foreground (simple)
docker run --rm -p 8000:8000 faiss-service
```

Optional background mode:
```powershell
docker run -d --name faiss-local -p 8000:8000 faiss-service
docker ps
docker logs -f faiss-local
docker stop faiss-local
```

## 3) FAISS API Management Commands
Check index stats:
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/stats"
```

Reset index:
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/reset"
```

## 4) Manual Test Data (PowerShell)
Create a 768-dim zero vector and add one test id:
```powershell
$vecCsv = ((1..768 | ForEach-Object { "0.0" }) -join ",")
$addBody = "{""vectors"":[[$vecCsv]],""ids"":[""test-chunk-1""]}"
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/add" -ContentType "application/json" -Body $addBody
```

Search top-k:
```powershell
$searchBody = "{""vector"":[$vecCsv],""top_k"":5}"
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/search" -ContentType "application/json" -Body $searchBody
```

## 5) Sync Real Project Data to FAISS
Run ingestion with force to rebuild chunk ids and push vectors into FAISS:
```powershell
cd C:\Users\xiaow\projects\insurance-platform\protego-insurtech-site
npx ts-node scripts/ingest.ts --force
```

Carrier-only backfill:
```powershell
npx ts-node scripts/ingest.ts --force --carrier Wellington
```

Then verify index count:
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/stats"
```

## 6) Daily Ops Checklist
Target order: `reset -> ingest -> stats -> smoke query`

1. Ensure Docker Desktop is running.
2. Start FAISS container:
   ```powershell
   cd C:\Users\xiaow\projects\insurance-platform\faiss-service
   docker run --rm -p 8000:8000 faiss-service
   ```
3. Reset index:
   ```powershell
   Invoke-RestMethod -Method Post -Uri "http://localhost:8000/reset"
   ```
4. Re-ingest vectors:
   ```powershell
   cd C:\Users\xiaow\projects\insurance-platform\protego-insurtech-site
   npx ts-node scripts/ingest.ts --force --carrier Wellington
   ```
5. Check index stats:
   ```powershell
   Invoke-RestMethod -Method Get -Uri "http://localhost:8000/stats"
   ```
6. FAISS smoke query:
   ```powershell
   $vecCsv = ((1..768 | ForEach-Object { "0.0" }) -join ",")
   $searchBody = "{""vector"":[$vecCsv],""top_k"":3}"
   Invoke-RestMethod -Method Post -Uri "http://localhost:8000/search" -ContentType "application/json" -Body $searchBody
   ```
7. App smoke query (FAISS API):
   ```powershell
   Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/carrier-assistant-faiss" `
     -ContentType "application/json" `
     -Body '{"carrier":"Wellington","lob":"HO","state":"TX","program":"","version":"Latest","question":"When does roof settlement switch to ACV?","topK":5}'
   ```
8. Optional baseline smoke query (pgvector API):
   ```powershell
   Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/carrier-assistant" `
     -ContentType "application/json" `
     -Body '{"carrier":"Wellington","lob":"HO","state":"TX","program":"","version":"Latest","question":"When does roof settlement switch to ACV?","topK":5}'
   ```
9. Compare route timings (pgvector vs FAISS):
   - `embedding_ms`
   - `retrieval_ms`
   - `llm_ms`
   - `total_ms`

Pass criteria:
- `GET /stats` shows `dimension = 768` and `total > 0`
- FAISS API returns answer with non-empty retrieved chunks/debug
- Response includes `sources`/citations (not generic fallback only)

## 7) Troubleshooting
`ECONNREFUSED` from app route:
- FAISS container is not running or wrong `FAISS_URL`.
- Restart container and confirm `http://localhost:8000/stats` works.

`retrieved 0` on FAISS route:
- Index empty/stale ids after reset/restart.
- Re-run ingest with `--force`.

PowerShell `curl` issues:
- Use `Invoke-RestMethod` or `curl.exe`.

Dimension mismatch errors:
- Current service expects 768 dimensions (`nomic-embed-text`).
- Ensure query/ingest embeddings use the same model and dimension.

## 8) Architecture Note
- FAISS handles vector nearest-neighbor retrieval only.
- PostgreSQL remains source of truth for chunk text/metadata.
- FAISS route retrieves ids from FAISS, then reads chunk content from PostgreSQL.

## 9) What "Manage Vector Databases" Includes
In practice, vector database management usually covers:

1. Data ingestion and updates分块、embedding、写入索引，处理增量更新和删除。
   - chunking, embedding, index writes
   - incremental updates and deletes
   - Files: `scripts/ingest.ts`, `prisma/schema.prisma`, `prisma/migrations/20260101145155_add_rag_tables/migration.sql`
2. Index maintenance索引维护：选择索引类型（HNSW/IVF/Flat）、调参数、重建索引。
   - index type selection (`HNSW` / `IVF` / `Flat`)
   - parameter tuning and index rebuilds
   - Files: `C:\Users\xiaow\projects\insurance-platform\faiss-service\app.py`, `C:\Users\xiaow\projects\insurance-platform\faiss-service\Dockerfile`, `docs/FAISS_OPS.md`
3. Retrieval quality optimization检索质量优化：调 top‑k、混合检索、rerank、过滤策略和召回率。
   - tuning `top-k`
   - hybrid retrieval and rerank
   - metadata filters and recall optimization
   - Files: `src/app/api/carrier-assistant/route.ts`, `src/app/api/carrier-assistant-faiss/route.ts`, `src/hooks/useCarrierAssistant.ts`
4. Performance and cost 性能与成本：控制延迟、内存、存储占用，做分片和冷热分层。
   - latency, memory, and storage control
   - sharding and hot/cold tiering
   - Files: `src/app/api/carrier-assistant/route.ts`, `src/app/api/carrier-assistant-faiss/route.ts`, `docs/FAISS_OPS.md`
   - Notes: sharding/hot-cold tiering are not implemented yet in this project.
5. Metadata governance
   - id mapping consistency
   - versioning, permission labels
   - source traceability
   - Files: `prisma/schema.prisma`, `scripts/ingest.ts`, `src/app/api/carrier-assistant/route.ts`, `src/app/api/carrier-assistant-faiss/route.ts`
6. Reliability operations 可靠性运维：备份恢复、持久化、监控（QPS/延迟/命中率）、告警。
   - backup/restore and persistence
   - monitoring (`QPS`, latency, hit rate)
   - alerting
   - Files: `docs/FAISS_OPS.md`, `src/app/api/carrier-assistant/route.ts`, `src/app/api/carrier-assistant-faiss/route.ts`
   - Notes: FAISS persistence/backup/alerting are not implemented yet (current setup is local and reset-based).
7. Security and compliance 安全合规：访问控制、PII 脱敏、审计日志、数据保留策略。
   - access control
   - PII masking/redaction
   - audit logs and data retention policies
   - Files: `.env`, `src/app/api/carrier-assistant/route.ts`, `src/app/api/carrier-assistant-faiss/route.ts`
   - Notes: PII redaction and formal retention policy are not fully implemented yet.
