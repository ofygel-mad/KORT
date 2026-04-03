# KORT Warehouse Engineering Spec v1

## Transaction design, data contracts, realtime model, and delivery bridge

**Status:** draft  
**Date:** 2026-04-03  
**Primary companion doc:** [WMS.md](C:/Users/user/Documents/KORT/WMS.md)  
**Purpose:** turn the warehouse roadmap into an execution-safe engineering spec for implementation teams.

---

## 1. Scope

This document is intentionally narrower than [WMS.md](C:/Users/user/Documents/KORT/WMS.md).

`WMS.md` defines:

- product doctrine
- target architecture direction
- phased roadmap
- capability map

This document defines:

- transactional boundaries
- source-of-truth rules
- canonical write/read model contracts
- outbox/inbox and retry semantics
- layout publish behavior under live operations
- endpoint contracts
- performance/storage budgets
- a delivery appendix mapping verified files to target replacements

It is still a draft engineering spec, not a final DDL file or final OpenAPI document.

---

## 2. Confidence model

This companion keeps the same labels as `WMS.md`:

- **[Verified]** directly supported by current repo code
- **[Likely]** repo-informed, but not fully proven end-to-end
- **[Proposed]** target-state implementation decision

Rule:

- anything affecting correctness under concurrent writes is treated as **[Proposed contract]** until implemented
- anything describing current file ownership should be treated as **[Verified]** only if explicitly listed in the appendix

---

## 3. System boundary and source-of-truth contract

### 3.1. Canonical boundary

The warehouse subsystem is responsible for:

- warehouse structure
- stock truth
- warehouse reservations
- warehouse tasks
- warehouse layout versions
- warehouse operational projections

Other modules consume warehouse outputs but do not own warehouse truth:

- Chapan
- accounting
- printable documents
- workspace shell

### 3.2. Final source-of-truth doctrine

**[Proposed]**

For the target system:

- stock truth = `WarehouseStockLedgerEvent` + `WarehouseReservation` + `WarehouseStockBalance`
- structure truth = `WarehouseSite/Zone/Aisle/Rack/Shelf/Bin`
- layout truth = `WarehouseLayoutVersion` + live published version pointer
- task truth = `WarehouseTask` + `WarehouseTaskStep`
- projection truth = recomputable read models derived from canonical writes

### 3.3. Transitional source-of-truth doctrine

Until migration completes:

- `warehouse_items` remains physically present
- `warehouse_items` may continue to be updated
- but `warehouse_items` must stop being an independently writable business model
- only the warehouse inventory orchestrator may mutate it

This is the key transition:

- **today:** `warehouse_items` is truth-like
- **during migration:** `warehouse_items` is compatibility state maintained atomically
- **after cutover:** `warehouse_items` is compatibility projection or is retired later

### 3.4. Non-negotiable consistency rule

For stock-changing commands, the following must never diverge at commit time:

1. canonical ledger write
2. canonical stock balance write
3. reservation state change if command affects reservation
4. compatibility row update if compatibility rows still exist
5. outbox record insertion

If one of these fails, the DB transaction fails.

---

## 4. Canonical data model v1

This is not full Prisma syntax yet. It is the intended contract-level data model.

### 4.1. Core structure tables

#### `warehouse_sites`

Purpose:

- explicit warehouse/site root per organization

Required fields:

- `id`
- `org_id`
- `code`
- `name`
- `status`
- `timezone`
- `published_layout_version_id`
- `created_at`
- `updated_at`

#### `warehouse_zones`

Required fields:

- `id`
- `org_id`
- `warehouse_site_id`
- `parent_zone_id`
- `code`
- `name`
- `zone_type`
- `status`
- `capacity_policy_json`
- `created_at`
- `updated_at`

#### `warehouse_aisles`

Required fields:

- `id`
- `org_id`
- `warehouse_site_id`
- `zone_id`
- `code`
- `direction_policy`
- `min_width_mm`
- `status`

#### `warehouse_racks`

Required fields:

- `id`
- `org_id`
- `warehouse_site_id`
- `zone_id`
- `aisle_id`
- `code`
- `rack_type`
- `status`
- `max_weight`
- `max_volume`
- `created_at`
- `updated_at`

#### `warehouse_shelves`

Required fields:

- `id`
- `rack_id`
- `level_index`
- `max_weight`
- `max_volume`

#### `warehouse_bins`

Required fields:

- `id`
- `org_id`
- `warehouse_site_id`
- `zone_id`
- `aisle_id`
- `rack_id`
- `shelf_id`
- `code`
- `status`
- `bin_type`
- `capacity_units`
- `capacity_weight`
- `capacity_volume`
- `pick_face_enabled`
- `created_at`
- `updated_at`

### 4.2. Variant and catalog tables

#### `warehouse_field_definitions`

Keep and extend current table as attribute schema owner.

Additional recommended fields later:

- `schema_version`
- `supersedes_definition_id`
- `is_deprecated`

#### `warehouse_product_catalog`

Keep as current product master inside warehouse scope.

#### `warehouse_variants`

Purpose:

- explicit canonical identity for stock-bearing product variants

Required fields:

- `id`
- `org_id`
- `product_catalog_id`
- `variant_key`
- `attributes_json`
- `attributes_summary`
- `schema_version`
- `is_active`
- `created_at`
- `updated_at`

Constraints:

- unique `(org_id, product_catalog_id, variant_key)`
- variant key immutable after first business reference

### 4.3. Inventory and reservation tables

#### `warehouse_stock_ledger_events`

Required fields:

- `id`
- `org_id`
- `warehouse_site_id`
- `variant_id`
- `from_bin_id`
- `to_bin_id`
- `event_type`
- `qty_delta`
- `stock_status_from`
- `stock_status_to`
- `source_type`
- `source_id`
- `source_line_id`
- `correlation_id`
- `idempotency_key`
- `actor_user_id`
- `actor_name`
- `created_at`

Constraints:

- unique `(org_id, idempotency_key)`
- index by `(org_id, warehouse_site_id, created_at desc)`
- index by `(org_id, variant_id, created_at desc)`

#### `warehouse_stock_balances`

Required fields:

- `id`
- `org_id`
- `warehouse_site_id`
- `variant_id`
- `bin_id`
- `stock_status`
- `qty_on_hand`
- `qty_reserved`
- `qty_available`
- `updated_at`

Constraints:

- unique `(org_id, warehouse_site_id, variant_id, bin_id, stock_status)`

#### `warehouse_reservations`

Current table can evolve, but target semantics should include:

- `id`
- `org_id`
- `warehouse_site_id`
- `variant_id`
- `qty_reserved`
- `source_type`
- `source_id`
- `source_line_id`
- `status`
- `idempotency_key`
- `created_at`
- `released_at`

### 4.4. Task, layout, and system tables

#### `warehouse_tasks`

Required fields:

- `id`
- `org_id`
- `warehouse_site_id`
- `task_type`
- `status`
- `priority`
- `source_type`
- `source_id`
- `source_line_id`
- `variant_id`
- `source_bin_id`
- `target_bin_id`
- `route_id`
- `layout_version_id`
- `assigned_user_id`
- `created_at`
- `accepted_at`
- `started_at`
- `completed_at`

#### `warehouse_routes`

Required fields:

- `id`
- `org_id`
- `warehouse_site_id`
- `layout_version_id`
- `route_type`
- `status`
- `estimated_distance_m`
- `estimated_duration_sec`
- `created_at`

#### `warehouse_layout_versions`

Required fields:

- `id`
- `org_id`
- `warehouse_site_id`
- `version_no`
- `state`
- `based_on_version_id`
- `published_at`
- `created_by`
- `created_at`
- `updated_at`

#### `warehouse_layout_changesets`

Required fields:

- `id`
- `layout_version_id`
- `action_type`
- `domain_type`
- `domain_id`
- `before_snapshot_json`
- `after_snapshot_json`
- `validation_status`
- `created_at`

#### `warehouse_outbox`

Required fields:

- `id`
- `org_id`
- `event_type`
- `aggregate_type`
- `aggregate_id`
- `correlation_id`
- `idempotency_key`
- `payload_json`
- `status`
- `attempt_count`
- `next_attempt_at`
- `last_error`
- `created_at`
- `sent_at`

#### `warehouse_projection_inbox`

Required fields:

- `id`
- `consumer_name`
- `event_id`
- `processed_at`

Constraints:

- unique `(consumer_name, event_id)`

---

## 5. Command model and transaction boundaries

### 5.1. General command processing pipeline

Every warehouse write command follows the same server-side structure:

1. authenticate and resolve org
2. validate payload shape
3. authorize command
4. compute or validate idempotency key
5. execute one DB transaction
6. return canonical result
7. let async projectors/realtime dispatch process outbox records after commit

### 5.2. DB transaction boundary

**[Proposed hard rule]**

One warehouse DB transaction covers:

1. idempotency check
2. read-for-update on affected balance/reservation rows
3. domain validation against current truth
4. canonical state mutation
5. compatibility row mutation if still enabled
6. outbox append
7. transaction commit

Anything outside this boundary is async and must be replayable from canonical truth.

### 5.3. Inside-transaction vs outside-transaction work

#### Must happen inside DB transaction

- ledger event insert
- stock balance upsert/update
- reservation create/release/update
- task state mutation if command includes task completion
- layout publish pointer swap
- compatibility row update
- outbox insert

#### Must happen outside DB transaction

- SSE fanout
- WebSocket fanout
- dashboard projections
- heatmap recomputation
- replay aggregates
- notifications

### 5.4. Command categories

Primary warehouse write commands:

- `post_stock_receipt`
- `post_stock_transfer`
- `post_stock_adjustment`
- `create_reservation`
- `release_reservation`
- `complete_pick_task`
- `complete_putaway_task`
- `publish_layout_version`

Each command gets:

- its own payload contract
- idempotency semantics
- result contract
- projector side effects

### 5.5. Transaction template for stock-changing commands

#### Canonical algorithm

Within one DB transaction:

1. lock idempotency scope
2. if command with same idempotency key already completed:
   - return stored result or reconstruct deterministic success response
3. load affected balances and reservations using row locks
4. validate:
   - sufficient stock
   - reservation state
   - site/bin validity
   - status transitions
5. write `warehouse_stock_ledger_events`
6. write/update `warehouse_stock_balances`
7. write/update `warehouse_reservations` if needed
8. write/update `warehouse_items` if compatibility mode enabled
9. append `warehouse_outbox`
10. commit

### 5.6. Compatibility row contract

`warehouse_items` compatibility updates must be treated as:

- deterministic projection maintained in the command transaction
- not a second source of business decisions

Compatibility row rules:

- no direct route writes once orchestrator migration starts
- no ad hoc increments outside orchestrator
- reads allowed during migration
- writes only through orchestrator

---

## 6. Transactional design by command

### 6.1. `post_stock_receipt`

Purpose:

- receive stock into a site/bin/status

#### Inputs

- `warehouseSiteId`
- `variantId`
- `toBinId`
- `qty`
- `stockStatus`
- `sourceType`
- `sourceId`
- `sourceLineId`
- `idempotencyKey`

#### In-transaction writes

- one or more ledger events
- one balance upsert/update
- compatibility row update
- outbox append

#### Response contract

- accepted canonical stock position
- affected balance summary
- correlation id

### 6.2. `post_stock_transfer`

Purpose:

- move stock between bins or statuses

#### Inputs

- `warehouseSiteId`
- `variantId`
- `fromBinId`
- `toBinId`
- `qty`
- `stockStatusFrom`
- `stockStatusTo`
- `sourceType`
- `sourceId`
- `idempotencyKey`

#### Validation

- from-balance exists
- available qty sufficient
- target bin valid and usable
- route/layout compatibility if operation is task-driven

#### In-transaction writes

- debit ledger event
- credit ledger event or single transfer event depending on final schema choice
- source balance update
- target balance update
- compatibility row update
- outbox append

### 6.3. `create_reservation`

Purpose:

- reserve stock for external demand such as Chapan order line

#### Inputs

- `warehouseSiteId`
- `variantId`
- `qty`
- `sourceType`
- `sourceId`
- `sourceLineId`
- `idempotencyKey`

#### Validation

- existing active reservation under same scope?
- enough available stock?
- reservation policy allows creation?

#### In-transaction writes

- reservation row insert or idempotent reuse
- balance update (`qty_reserved`, `qty_available`)
- compatibility row update if needed
- ledger event insert if reservation movements are tracked as first-class events
- outbox append

### 6.4. `release_reservation`

Purpose:

- release previously reserved stock

#### Inputs

- `reservationId`
- `releaseReason`
- `idempotencyKey`

#### Validation

- reservation exists
- reservation is releasable
- release not already applied

#### In-transaction writes

- reservation status update
- balance update
- compatibility row update
- ledger event insert if reservation release is first-class
- outbox append

### 6.5. `complete_pick_task`

Purpose:

- confirm execution of a pick and consume stock

#### Inputs

- `taskId`
- `pickedQty`
- `actualFromBinId`
- optional discrepancy reason
- `idempotencyKey`

#### Validation

- task belongs to current layout version or is still valid under route migration policy
- task status allows completion
- stock/reservation consistency holds

#### In-transaction writes

- task state update
- ledger event insert
- balance update
- reservation fulfillment/reduction
- compatibility row update
- outbox append

### 6.6. `publish_layout_version`

Purpose:

- atomically switch live layout to a validated version

#### Inputs

- `warehouseSiteId`
- `layoutVersionId`
- `publishCommandId`
- `idempotencyKey`

#### Validation

- version is validated
- no hard blockers remain
- permissions allow publish
- task impact matrix resolved

#### In-transaction writes

- published version pointer update on site
- layout version state update
- impacted route/task state changes if part of atomic publish
- outbox append

#### Out-of-transaction work

- route recomputation jobs
- control tower refresh
- scene refresh broadcasts

---

## 7. Outbox, inbox, retry, and compensation model

### 7.1. Outbox pattern

**[Proposed hard rule]**

Every canonical warehouse write inserts an outbox record in the same DB transaction as the domain mutation.

Outbox event families:

- `warehouse.stock.changed`
- `warehouse.reservation.changed`
- `warehouse.task.changed`
- `warehouse.layout.published`
- `warehouse.exception.changed`

### 7.2. Why outbox is required

Without transactional outbox:

- ledger may commit but projections may miss updates
- layout publish may commit but scene cache may remain stale
- retries may duplicate downstream effects

Outbox is the bridge between:

- canonical synchronous truth
- asynchronous read models and realtime delivery

### 7.3. Inbox pattern

Every async consumer that mutates durable projection state must use an inbox table or equivalent processed-event registry.

Consumers requiring inbox semantics:

- stock balance secondary projectors if split from command path later
- warehouse health projector
- task load projector
- occupancy projector
- replay aggregate projector
- external integration relays if they persist state

Consumer contract:

- read outbox event
- check `(consumer_name, event_id)` uniqueness
- process once
- store processed marker

### 7.4. Retry semantics

Retry strategy by class:

#### Class A. Internal projection retry

Examples:

- warehouse health projection
- occupancy projection
- replay aggregate

Rules:

- exponential backoff
- safe reprocessing through inbox/idempotent projector
- dead-letter after max attempts

#### Class B. Realtime fanout retry

Examples:

- SSE fanout
- WS fanout

Rules:

- no durable retry required for every missed socket message
- client can recover through refetch/subscription resync
- realtime delivery is best-effort, projection consistency is durable

#### Class C. External integration retry

Examples:

- accounting relay if moved fully async later
- export/webhook relays

Rules:

- durable retry required
- explicit dead-letter queue after max attempts
- operator-visible failure state if business critical

### 7.5. Retry schedule

**[Proposed default]**

- attempt 1: immediate
- attempt 2: +5s
- attempt 3: +30s
- attempt 4: +2m
- attempt 5: +10m
- then dead-letter / operator review

### 7.6. Dead-letter policy

Outbox events move to dead-letter handling when:

- max attempts exceeded
- payload invalid for consumer
- irreversible downstream rejection occurs

Dead-letter handling must include:

- event id
- aggregate id
- error summary
- first failed at
- last failed at
- owning subsystem

### 7.7. Compensation semantics

Important rule:

- do **not** roll back already committed canonical ledger through ad hoc DB mutation outside business commands

Use compensating actions instead.

#### Examples

If external accounting sync fails after stock receipt commit:

- warehouse canonical commit remains valid
- outbox retry continues
- if business demands reversal, issue explicit compensating warehouse command such as `post_stock_adjustment` or domain-specific reversal

If layout publish commits but route projector fails:

- published layout remains canonical
- affected tasks/routes enter `recompute_pending` / `supervisor_review_required`
- projector retry or operator intervention resolves downstream consistency

### 7.8. Consistency contract between ledger, balance, and compatibility rows

Consistency levels:

#### Strong consistency at commit

Must be true immediately after transaction commit:

- ledger matches applied command
- stock balances reflect ledger effect
- reservation rows reflect ledger effect
- compatibility rows reflect canonical result if compatibility mode enabled

#### Eventual consistency after commit

May lag:

- dashboards
- health scores
- congestion overlays
- replay aggregates
- non-critical scene overlays

### 7.9. Failure handling contract

If canonical commit fails:

- HTTP request fails
- nothing is committed

If canonical commit succeeds but async projections fail:

- HTTP request still succeeds
- outbox retry handles downstream repair
- UI may temporarily show stale derived views, but refetch and replay from canonical state must fix it

---

## 8. Endpoint contract set v1

This section defines the first engineering-level endpoint set. Naming can still change, but semantics should not drift.

### 8.1. Command endpoint style

Recommended style:

- commands use `POST`
- commands are explicit verbs where business meaning matters
- all command endpoints accept `Idempotency-Key`

### 8.2. Structure endpoints

#### `GET /api/v1/warehouse/sites`

Returns:

- list of sites visible to org
- current published layout version id
- summary stats per site

#### `POST /api/v1/warehouse/sites`

Creates site.

Input:

- `code`
- `name`
- `timezone`

#### `GET /api/v1/warehouse/sites/:id/structure`

Returns:

- site metadata
- zone/aisle/rack/shelf/bin tree
- lightweight capacity/status summary

### 8.3. Inventory endpoints

#### `GET /api/v1/warehouse/inventory/balances`

Query parameters:

- `siteId`
- `variantId`
- `binId`
- `zoneId`
- `status`
- `search`
- `cursor` or `page`

Returns:

- canonical balance rows

#### `POST /api/v1/warehouse/inventory/receipts`

Command:

- `post_stock_receipt`

Body:

- `warehouseSiteId`
- `variantId`
- `toBinId`
- `qty`
- `stockStatus`
- `sourceType`
- `sourceId`
- `sourceLineId`

Headers:

- `Idempotency-Key`

Returns:

- `commandId`
- `correlationId`
- `balanceSnapshot`

#### `POST /api/v1/warehouse/inventory/transfers`

Command:

- `post_stock_transfer`

#### `POST /api/v1/warehouse/inventory/adjustments`

Command:

- `post_stock_adjustment`

### 8.4. Reservation endpoints

#### `POST /api/v1/warehouse/reservations`

Command:

- `create_reservation`

#### `POST /api/v1/warehouse/reservations/:id/release`

Command:

- `release_reservation`

### 8.5. Task endpoints

#### `GET /api/v1/warehouse/tasks`

Query:

- `siteId`
- `status`
- `taskType`
- `assigneeId`
- `zoneId`
- `priority`

#### `POST /api/v1/warehouse/tasks/:id/accept`

#### `POST /api/v1/warehouse/tasks/:id/complete-pick`

Body:

- `pickedQty`
- `actualFromBinId`
- `discrepancyCode`

#### `POST /api/v1/warehouse/tasks/:id/complete-putaway`

Body:

- `actualToBinId`
- `putawayQty`

### 8.6. Layout endpoints

#### `POST /api/v1/warehouse/layouts/:siteId/drafts`

Creates draft version from current published version.

#### `PATCH /api/v1/warehouse/layout-drafts/:id/nodes/:nodeId`

Applies draft-local transform/metadata change.

#### `POST /api/v1/warehouse/layout-drafts/:id/validate`

Returns:

- errors
- warnings
- impacted tasks count
- impacted routes count
- occupied-node conflicts

#### `POST /api/v1/warehouse/layout-drafts/:id/publish`

Headers:

- `Idempotency-Key`

Returns:

- `publishedLayoutVersionId`
- `impactedTaskSummary`
- `routeRecomputeJobId`

### 8.7. Spatial endpoints

#### `GET /api/v1/warehouse/spatial/scenes/:siteId`

Returns:

- scene manifest
- visible chunk descriptors
- published layout version
- initial overlay summaries

#### `GET /api/v1/warehouse/spatial/chunks/:chunkId`

Returns:

- node payload for one chunk

#### `GET /api/v1/warehouse/spatial/object/:domainType/:domainId`

Returns:

- object metadata
- transform
- occupancy/task context
- classic deep-link metadata

### 8.8. Realtime endpoints

#### `GET /api/v1/warehouse/realtime/sse/:siteId`

SSE event families:

- `projection.inventory.updated`
- `projection.task_load.updated`
- `projection.health.updated`
- `task.updated`
- `exception.updated`
- `layout.published`

#### `WS /api/v1/ws/warehouse/:siteId`

Planned WS families:

- `scene.patch`
- `overlay.patch`
- `route.patch`
- `draft.collaboration`
- `worker.position`

---

## 9. Layout publish task-impact policy matrix

This matrix is the operational decision contract for publish under live work.

### 9.1. Decision table

| Task state / route state | Example | Publish policy | System action | UI / supervisor outcome |
|---|---|---|---|---|
| `pick_task` `in_progress` and impacted by path/layout change | picker already in aisle | hard block for disruptive changes | block publish | explicit “active pick in progress” blocker |
| `pick_task` `assigned` but not started | task queued to worker | allow only if route can be recomputed safely | mark route invalidated and recompute | supervisor-visible migration summary |
| `putaway_task` `assigned` but not started | inbound task waiting | allow if target node still valid or remappable | recompute target/route | supervisor review if remap required |
| `putaway_task` `in_progress` and target node touched | operator moving stock now | hard block for disruptive changes | block publish | user must complete, cancel, or migrate task first |
| partially completed multi-stop route | first stops done, later stops impacted | publish allowed only if remaining stops can be safely rerouted | split completed vs pending stops, recompute pending | route shows `rerouted_after_publish` |
| count task on unaffected nodes | cycle count elsewhere | allow | no task migration | silent/normal |
| count task on impacted nodes | count on area being changed | block unless task cancelled/finished | block publish or require cancellation | supervisor-required |
| no active tasks, occupied nodes impacted | stock sits in bins but no active route | block unless stock migration plan exists | require migration plan | publish screen shows stock migration blocker |
| no active tasks, unoccupied nodes impacted | empty racks/aisles | allow if structural validation passes | publish | normal |

### 9.2. Task impact statuses

Impacted tasks after validation must be classified into one of:

- `unaffected`
- `auto_reroutable`
- `requires_supervisor_review`
- `requires_stock_migration`
- `publish_blocker`

### 9.3. Publish UX requirements

When publish is blocked:

- validation result must show blocker count
- each blocker must link to object/task
- each blocker must show suggested resolution
- supervisor must be able to export or inspect a conflict sheet

### 9.4. SLA expectation for blocked publish

**[Proposed]**

Blocked publish should fail fast:

- validation response target: under `2s` for small/medium layouts
- under `5s` for large layouts where full graph checks are needed

If validation exceeds fast-response budgets:

- job-based validation can be used
- but user must still get immediate “validation running” state with progress and blocker summary when ready

---

## 10. Performance budgets v1

These are the initial engineering budgets so FE and BE design against the same limits.

### 10.1. First-12-month target scale

**[Proposed planning assumption]**

For first 12 months of warehouse twin rollout, design for:

- up to `100` orgs using warehouse module meaningfully
- up to `20` active warehouse sites per org in the upper planning bound
- typical org: `1–3` sites
- medium site target as primary optimization case

This is a planning budget, not current customer fact.

### 10.2. Scene tier budgets

#### Tier S: small site

- up to `2,000` spatial nodes
- initial scene payload target: `<= 500 KB` compressed
- overlay patch target: `<= 50 KB` per update

#### Tier M: medium site

- up to `10,000` spatial nodes
- initial manifest target: `<= 250 KB` compressed
- first visible chunks target: `<= 1 MB` compressed combined
- overlay patch target: `<= 100 KB`

#### Tier L: large site

- `10,000–50,000+` nodes
- chunked loading mandatory
- no full-detail single payload fetch
- minimap and distant zones must use aggregate geometry only

### 10.3. Update-rate budgets

#### Summary / dashboard

- target refresh latency: `1–5s`

#### Task/control tower

- target visible update latency: `sub-2s`

#### Scene overlay patches

- target patch frequency: `1–2 Hz` default
- burst mode allowed for direct interaction, but sustained dense updates should be throttled

#### Worker movement telemetry

- target visual update rate: `2–5 Hz`
- raw telemetry ingestion may be higher, but render updates should be smoothed

### 10.4. Fallback thresholds

Automatic fallback triggers for spatial mode:

- low GPU capability
- sustained frame rate below `30 FPS`
- high scene node count
- thermal throttling/mobile constraints

Fallback actions:

- reduce shadows
- reduce animation density
- hide worker markers
- disable expensive post-processing
- switch to aggregate overlay mode

### 10.5. Minimum browser/device profile

**[Proposed baseline support target]**

- desktop-first
- modern Chromium, Edge, Safari, Firefox latest stable and recent previous
- minimum: hardware/browser capable of stable WebGL2 scene rendering
- mobile access allowed for limited read scenarios, but full spatial edit is not a first-release requirement

### 10.6. Storage budgets

#### Ledger

- append-only growth expected
- partitioning or archival strategy should be considered once sites reach sustained high event volume

#### Replay

- high-frequency telemetry retained shorter than canonical stock history
- stock ledger and business events retained longer than scene animation detail

#### Projection tables

- projections are disposable/rebuildable
- retention driven by current read needs, not by compliance truth

---

## 11. Machine-checkable appendix bridge

This appendix is not actually machine-generated, but it is structured so it can be converted into machine-checkable planning data later.

### 11.1. Verified file/path appendix

| Verified file/path | Inferred current responsibility | Gaps | Target replacement / future role | Suggested migration owner |
|---|---|---|---|---|
| `server/src/modules/warehouse/warehouse.service.ts` | flat inventory, movements, BOM, reservations, alerts, lots, summary | too broad, no canonical structure or ledger | split into inventory/reservation/task/projection services | backend |
| `server/src/modules/warehouse/warehouse.routes.ts` | current warehouse HTTP surface | inventory-shaped, not full WMS | keep prefix, split route modules by bounded context | backend |
| `server/src/modules/warehouse/warehouse-catalog.service.ts` | attribute schema, product catalog, variant availability, imports | no schema versioning contract yet | remain catalog core with stronger versioning | backend |
| `server/src/modules/warehouse/warehouse-catalog.routes.ts` | catalog/order-form/smart-import routes | no canonical variant snapshot write path | stay active, feed canonical variant layer | backend |
| `server/src/modules/chapan/orders.service.ts` | order create/update, warehouse routing, reservation touchpoints | still legacy-heavy on variant payload writes | become warehouse consumer through canonical variant/reservation contracts | backend |
| `server/src/modules/accounting/accounting.sync.ts` | accounting event definitions and sync helper | live coupling to warehouse writes not yet confirmed | inventory posting adapter should own accounting relay | backend/accounting |
| `server/src/modules/imports/adapters/warehouse.adapter.ts` | warehouse import adapter foundations | not aligned to twin structure/ledger model | refactor into catalog/stock import pipeline | backend/imports |
| `src/pages/warehouse/index.tsx` | warehouse route shell | placeholder only | replace with real warehouse shell | frontend |
| `src/pages/warehouse/WarehouseCatalog.tsx` | catalog/import/admin UI | not mounted, readiness not fully verified | mount as Classic sub-view or admin section | frontend |
| `src/entities/warehouse/api.ts` | warehouse client API layer | flat/current surface only | extend with canonical WMS endpoints | frontend |
| `src/entities/warehouse/queries.ts` | React Query hooks for warehouse | no structure/task/spatial/control-tower hooks yet | remain client-state access layer | frontend |
| `src/pages/workzone/chapan/orders/ChapanNewOrder.tsx` | order-form consumption of catalog + availability | still mixed legacy/canonical write semantics | dual-write then canonical-first payload | frontend |
| `src/features/workspace/widgets/warehouse/WarehouseTilePreview.tsx` | warehouse workspace preview | broken missing store import | replace with React Query / warehouse summary hook | frontend |
| `src/features/workspace/scene/*` | workspace 3D world, transition language, tile shells | not warehouse twin scene graph | reuse for entry transitions and visual language | frontend/3D |

### 11.2. Gap-to-owner appendix

| Gap | Proposed owner |
|---|---|
| canonical stock orchestrator | backend |
| warehouse site/structure schema | backend |
| layout validation engine | backend + frontend for UX |
| warehouse shell page | frontend |
| spatial scene and overlays | frontend/3D |
| realtime outbox/projector pipeline | backend |
| canonical variant snapshot writes in Chapan | backend + frontend |
| warehouse tile preview repair | frontend |

### 11.3. Open engineering decisions still requiring explicit ADRs

- exact Prisma schema names for canonical ledger/balance tables
- whether balance projection remains sync-in-transaction permanently or later moves to projector path
- whether accounting sync remains inline or becomes pure outbox consumer
- exact chunking strategy for scene serialization
- whether collaborative draft editing is in initial WS scope or later

---

## 12. Immediate next implementation documents

After this file, the next most useful artifacts are:

1. `DDL / Prisma schema proposal v1`
2. `OpenAPI / endpoint contract draft v1`
3. `Delivery breakdown v1`:
   - epic
   - feature
   - dependency
   - acceptance criteria
   - owner

This file is intended to be the bridge into those artifacts, not the replacement for them.

