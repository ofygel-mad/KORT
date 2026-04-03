# KORT Warehouse Twin

**Companion engineering spec:** [WMS_ENGINEERING_SPEC.md](C:/Users/user/Documents/KORT/WMS_ENGINEERING_SPEC.md)  
This file is the architecture roadmap / doctrine layer. The companion file is the transactional, endpoint, realtime, and delivery-bridge implementation layer.

## Unified technical vision, architecture roadmap, and task breakdown

**Document status:** draft  
**Date:** 2026-04-03  
**Scope:** clean "Склад" section only  
**Goal:** transform the current warehouse foundation in KORT into a dual-mode WMS where `Classic Mode` and `Spatial Mode` are equal interfaces over one warehouse truth.

---

## 1. Executive summary

KORT Warehouse must stop being a placeholder page plus a set of isolated stock endpoints.

It must become a new operational pillar of the product:

- `Classic Mode` for strict enterprise workflows
- `Spatial Mode` for digital twin / 3D interaction
- `Control Tower` for live warehouse operations
- `Simulation / Replay` as higher-order differentiator

The key product doctrine is:

> One warehouse truth. Two equal control surfaces.

This does **not** mean “add a красивый 3D viewer on top of tables”.

It means:

- the same warehouse entities exist in both classic and spatial form;
- the same permissions, audit trail, and posting rules apply in both modes;
- changing structure or state in one mode must be reflected in the other mode;
- 3D must be a valid interaction surface, not decorative visualization.

This document is based on the **current KORT repo and stack**, but it is not a pure code inventory. It mixes:

- verified current-state findings from the repo
- likely but not fully verified operational assumptions
- proposed target-state architecture

So it should be read as an **architecture-aware roadmap plus implementation spec draft**, not as a perfect as-built system description.

The repo-informed baseline for this document is:

- frontend: React 18 + TypeScript + Vite + React Query + Zustand + Three.js dependencies
- backend: Fastify 5 + Prisma + PostgreSQL
- auth: JWT + org-scoped multitenancy
- current warehouse code: `server/src/modules/warehouse/*`
- current smart catalog foundation: `warehouse_field_definitions`, `warehouse_product_catalog`, `variant_key`, `attributes_json`
- current Chapan integration: `server/src/modules/chapan/orders.service.ts`
- current workspace 3D foundation: `src/features/workspace/scene/*`

The roadmap below therefore follows an **evolution path**, not a rewrite path.

### 1.1. Confidence taxonomy

This document uses three confidence labels:

- **[Verified]** — directly supported by the current repo state inspected in code
- **[Likely]** — repo-informed and plausible, but not fully confirmed end-to-end
- **[Proposed]** — target-state design decision for implementation

Rule of interpretation:

- sections `3` and parts of `14` are mostly current-state and should be read through this confidence lens
- sections `6+` are mostly target-state by definition and therefore primarily **[Proposed]**
- if a statement affects execution safety and is not yet fully verified, it should not be treated as production truth without code confirmation

---

## 2. Product doctrine

### 2.1. Core statement

**KORT Warehouse = Physical Space + Inventory Logic + Realtime Operations + Spatial UX**

### 2.2. Final product sentence

**KORT Warehouse is a managed digital warehouse twin where the user can work either through a classic enterprise interface or directly through a spatial 3D environment, and both modes synchronously edit the same operational reality.**

### 2.3. What this is not

Do not build:

- a separate “3D mini-game”
- a decorative viewer disconnected from warehouse truth
- a UX that bypasses inventory integrity
- an Unreal-grade demo that breaks enterprise browser constraints
- a big-bang warehouse rewrite that destroys current Chapan and accounting flows

### 2.4. Mandatory principles

1. **One reality, two interfaces**
2. **No stock mutation without business trace**
3. **Spatial data is first-class domain data**
4. **Classic and spatial both obey permissions and audit**
5. **3D must improve comprehension, not just “wow effect”**
6. **Backward-compatible migration is mandatory**

---

## 3. Current architecture baseline

This section describes the real repo state as of this document.

### 3.1. Backend architecture that already exists

KORT server already follows a clear feature-module pattern:

- `server/src/app.ts` registers route modules under `/api/v1/*`
- each module uses `*.routes.ts` + `*.service.ts`
- auth and multitenancy are enforced through `authenticate` + `resolveOrg`
- all warehouse data is currently scoped by `orgId`

Current relevant modules:

- `server/src/modules/warehouse/warehouse.service.ts`
- `server/src/modules/warehouse/warehouse.routes.ts`
- `server/src/modules/warehouse/warehouse-catalog.service.ts`
- `server/src/modules/warehouse/warehouse-catalog.routes.ts`
- `server/src/modules/chapan/orders.service.ts`
- `server/src/modules/accounting/accounting.sync.ts`

### 3.2. Frontend architecture that already exists

Frontend uses:

- React + TypeScript
- React Query for server state
- Zustand for local state stores
- route-based page composition
- custom workspace 3D runtime in `src/features/workspace/scene/*`
- global API client in `src/shared/api/client.ts`

Relevant current frontend surfaces:

- `src/pages/warehouse/index.tsx` — currently only placeholder
- `src/pages/warehouse/WarehouseCatalog.tsx` — substantial catalog UI surface exists, but it is not mounted by the route and its production readiness is not fully verified end-to-end
- `src/entities/warehouse/*` — typed warehouse API/query layer
- `src/pages/workzone/chapan/orders/ChapanNewOrder.tsx` — already partially reads warehouse order-form catalog
- `src/features/workspace/widgets/warehouse/WarehouseTilePreview.tsx` — warehouse tile preview exists, but currently references a missing store import

### 3.3. Current warehouse domain that already exists

Current Prisma warehouse models:

- `WarehouseCategory`
- `WarehouseLocation`
- `WarehouseItem`
- `WarehouseMovement`
- `WarehouseReservation`
- `WarehouseBOMLine`
- `WarehouseAlert`
- `WarehouseLot`

Current warehouse behavior already covers:

- inventory items with qty and reservation counters
- stock movements
- low stock alerts
- BOM-based Chapan shortage checks
- reservations for Chapan orders
- lot tracking
- dashboard summary

### 3.4. Current smart catalog foundation that already exists

The project already contains a very important second warehouse layer:

- `WarehouseFieldDefinition`
- `WarehouseFieldOption`
- `WarehouseProductCatalog`
- `WarehouseProductField`

And the following fields were already added to stock and order entities:

- `warehouse_items.product_catalog_id`
- `warehouse_items.variant_key`
- `warehouse_items.attributes_json`
- `warehouse_items.attributes_summary`
- `chapan_order_items.variant_key`
- `chapan_order_items.attributes_json`
- `chapan_order_items.attributes_summary`

This means the repo already started moving toward a **variant-aware warehouse model**.

### 3.5. Current Chapan integration state

The Chapan order form already consumes:

- `GET /api/v1/warehouse/order-form/catalog`
- `POST /api/v1/warehouse/availability/check-variant`

However, the order create/update flow still writes primarily legacy fields:

- `productName`
- `size`
- `color`
- `gender`
- `length`

and does **not yet** consistently write:

- `variantKey`
- `attributesJson`
- `attributesSummary`

Therefore the smart catalog exists, but the write path is still transitional.

### 3.6. Current workspace / 3D state

KORT already has a strong workspace world layer:

- custom Three.js runtime
- shell previews
- tile depth profiles
- camera, terrain, atmosphere, minimap, flight behavior

Relevant files:

- `src/features/workspace/scene/sceneRuntime.ts`
- `src/features/workspace/scene/sceneConfig.ts`
- `src/features/workspace/scene/sceneShells.ts`
- `src/features/workspace/scene/sceneShellPreviewRegistry.ts`

This is a strong base for:

- warehouse world entry transitions
- visual continuity with the rest of KORT
- tactical zoom-in from workspace into warehouse twin

### 3.7. Current realtime and permissions state

Realtime foundations already exist:

- SSE client hook in `src/shared/hooks/useSSE.ts`
- raw WebSocket infrastructure for chat in `server/src/modules/chat/chat.ws.ts`

Permission foundations already exist:

- org role hierarchy via `resolveOrg`
- employee permission array via `employee_permissions`
- warehouse access gate via `warehouse_manager`
- observer/read-only behavior via `observer`

Current warehouse permission model is still coarse, but the extension point is present.

### 3.8. Repo verification register

| Claim | Status | Notes |
|---|---|---|
| `/warehouse` route is still a placeholder page | **[Verified]** | `src/pages/warehouse/index.tsx` currently renders only an “in development” placeholder |
| `WarehouseCatalog.tsx` exists and contains real catalog CRUD/import UI | **[Verified]** | The file is substantial and wired to `warehouseCatalogApi`, but production-readiness is **not** fully verified end-to-end |
| `WarehouseCatalog.tsx` is already mounted on the main `/warehouse` route | **[Verified false]** | It exists, but the current route does not mount it |
| `WarehouseTilePreview` depends on a missing `useWarehouseStore` implementation | **[Verified]** | `src/features/workspace/widgets/warehouse/WarehouseTilePreview.tsx` imports `../../../warehouse-spa/model/warehouse.store`, and no such file was found in the repo scan |
| Accounting module defines warehouse event types `warehouse.movement_in` and `warehouse.write_off` | **[Verified]** | Present in `server/src/modules/accounting/accounting.sync.ts` |
| Current warehouse service already calls accounting sync on stock mutation | **[Not verified]** | Repo scan found the accounting sync helper definition, but no direct call site from current warehouse service was confirmed |
| Import scanner/adapter foundations exist for warehouse data | **[Verified]** | `server/src/modules/imports/scanner/*` and `server/src/modules/imports/adapters/warehouse.adapter.ts` exist |
| Generic imports module is already mounted as a production warehouse import API | **[Verified false]** | Scanner/adapter code exists, but mounted route registration for a generic warehouse imports module was not confirmed in `server/src/app.ts` |
| Smart catalog import routes under `/api/v1/warehouse` already exist | **[Verified]** | Confirmed in `warehouse-catalog.routes.ts` |
| Current import foundations are compatible with the future warehouse twin path without notable refactor | **[Likely]** | Plausible at catalog/import level, but not verified for full twin/ledger/structure migration |

---

## 4. Current-state gap analysis

| Area | Exists now | Missing now | Consequence |
|---|---|---|---|
| Route surface | `/warehouse` route exists | real page shell missing | warehouse is product-invisible |
| Inventory core | items, movements, alerts, reservations, lots | explicit warehouse/site/zone/bin structure | cannot model physical layout |
| Catalog | field definitions, options, product catalog, variant key builder | full dual-write/read across warehouse + Chapan | variant truth still fragmented |
| Spatial layer | workspace 3D foundations exist | warehouse scene graph, spatial nodes, layout versions | no digital twin yet |
| Realtime | SSE hook, WS pattern | warehouse event stream and projections | no live operations layer |
| Permissions | `warehouse_manager` and `observer` | granular warehouse control permissions | impossible to safely expose editing tiers |
| Accounting linkage | warehouse accounting sync foundations exist | migration-safe ledger abstraction and verified live coupling | stock engine changes may break accounting |
| Testing | order integration touches warehouse indirectly | dedicated WMS BE/FE/e2e suites | high regression risk |

### 4.1. Structural gap

Current warehouse data model is effectively:

- org-scoped
- mostly single-warehouse-by-assumption
- based on flat `WarehouseLocation`
- not suitable for zone / aisle / rack / bin hierarchy

### 4.2. Inventory integrity gap

Current `warehouse_items.qty` is a mutable balance field updated directly inside movement logic. This is acceptable for the current scope, but not strong enough as the final warehouse truth for:

- spatial edits
- multiple bins
- task execution
- simulation
- replay
- advanced audit

### 4.3. Spatial gap

There is no warehouse-specific:

- scene graph
- structure serializer
- layout versioning
- spatial permissions
- object overlays
- 2D-to-3D navigation bridge

### 4.4. Product gap

The project already has pieces of a future warehouse system, but they are scattered:

- a real backend inventory module
- a real smart catalog module
- partial order-form integration
- a 3D workspace foundation
- a placeholder warehouse page

This is exactly why the implementation strategy must focus on **convergence**.

---

## 5. Product goals and non-goals

### 5.1. Product goals

1. Build a true warehouse pillar, not a placeholder page.
2. Preserve enterprise rigor while adding spatial control.
3. Make warehouse state legible faster than 1C-style document-first systems.
4. Use 3D as a real interaction surface.
5. Prepare a foundation for simulation, replay, and predictive layers.

### 5.2. Business goals

- reduce warehouse orientation time
- reduce stock lookup friction
- reduce wrong-pick / hidden shortage cases
- improve finished-goods availability confidence for Chapan
- create a visible differentiator for KORT Industrial mode

### 5.3. Non-goals for first releases

- no UE5/native client
- no full warehouse robotics platform
- no photorealistic rendering target
- no fully generalized WMS for every warehouse type in release 1
- no replacement of all ERP/accounting document flows in one phase

---

## 6. Target system architecture

### 6.1. High-level system model

The target system should be built from seven connected cores:

1. **Catalog & variants core**
2. **Inventory & ledger core**
3. **Warehouse structure core**
4. **Task & operations core**
5. **Spatial twin core**
6. **Projection & realtime core**
7. **Integration & audit core**

### 6.2. The core architectural statement

There must be one shared domain state graph:

- structure truth
- inventory truth
- task truth
- exception truth
- layout truth

And two primary projections:

- classic projection
- spatial projection

### 6.3. Layered architecture

#### Layer A. Domain write model

Responsible for:

- warehouse structure changes
- stock transactions
- task state transitions
- exception resolution
- layout draft changes

#### Layer B. Projection model

Responsible for:

- dashboards
- lists
- heat maps
- task boards
- scene graph payloads
- minimap payloads
- replay streams

#### Layer C. UI and interaction model

Responsible for:

- classic tables and forms
- spatial scene interaction
- control tower widgets
- layout editor
- simulation UX

### 6.4. Architectural boundaries

#### Catalog & variants core

Canonical responsibility:

- product model definition
- field definitions
- field options
- variant identity
- variant attribute normalization
- variant summary rendering

#### Inventory & ledger core

Canonical responsibility:

- stock mutation
- stock reservation
- availability calculation
- lot/serial policy
- stock status transitions
- accounting-side movement emission

#### Structure core

Canonical responsibility:

- physical warehouse hierarchy
- spatial addressability
- storage capacity
- route connectivity

#### Task & operations core

Canonical responsibility:

- receiving
- putaway
- picking
- replenishment
- counts
- transfers
- packing/shipping handoff
- exceptions

#### Spatial twin core

Canonical responsibility:

- scene graph payload
- object transforms
- visual states
- interaction rules
- layout draft mutations

#### Projection & realtime core

Canonical responsibility:

- low-latency read models
- SSE/WS event fanout
- control tower KPIs
- congestion / occupancy / risk overlays

#### Integration & audit core

Canonical responsibility:

- Chapan order integration
- printing/doc generation
- Sheets/export compatibility
- accounting sync
- audit trail

---

## 7. Migration doctrine

This project must be built by **layering** on top of what exists.

### 7.1. What must remain compatible during migration

The following must not be broken during early phases:

- `/api/v1/warehouse/items`
- `/api/v1/warehouse/movements`
- `/api/v1/warehouse/summary`
- `/api/v1/warehouse/order-form/catalog`
- `/api/v1/warehouse/availability/check-variant`
- Chapan order create/update flow
- BOM shortage checks
- reservation release on order terminal states
- accounting sync for warehouse movements

### 7.2. Transitional doctrine

#### Phase doctrine A: dual-write

While legacy fields are still in use, the system writes:

- legacy shape
- new canonical shape

Example:

- order item keeps `size/color/gender/length`
- but also writes `attributesJson`, `attributesSummary`, `variantKey`

#### Phase doctrine B: projection-first migration

Do not try to replace `warehouse_items` as read surface immediately.

Instead:

- keep `warehouse_items` operational
- introduce canonical ledger/variant/structure tables
- project into warehouse list views
- switch reads incrementally

#### Phase doctrine C: compatibility adapters

Existing services such as:

- Chapan order form
- invoice generation
- warehouse tile preview
- accounting sync

must consume compatibility adapters instead of directly depending on unstable internal rewrites.

### 7.3. Mandatory migration rules

1. No big-bang rename of current warehouse tables.
2. No breaking route contract for already-used warehouse endpoints in P0/P1.
3. No spatial editing that bypasses stock/document/task audit.
4. No ledger redesign that drops accounting event emission.

---

## 8. Target data model evolution

### 8.1. Keep and strengthen current tables

These tables are already useful and should remain through P0/P1:

- `warehouse_items`
- `warehouse_movements`
- `warehouse_reservations`
- `warehouse_alerts`
- `warehouse_lots`
- `warehouse_field_definitions`
- `warehouse_field_options`
- `warehouse_product_catalog`
- `warehouse_product_fields`
- `chapan_order_items`

### 8.2. Add missing canonical structure entities

Current system has no explicit warehouse/site entity. That is the first structural gap.

Recommended new entities:

- `WarehouseSite`
- `WarehouseZone`
- `WarehouseAisle`
- `WarehouseRack`
- `WarehouseShelf`
- `WarehouseBin`
- `WarehouseDock`
- `WarehouseOperationalArea`

Minimum doctrine:

- one organization may have many warehouse sites
- every org gets a seeded default site during migration
- current flat `WarehouseLocation` becomes legacy compatibility layer

### 8.3. Add canonical variant entity

Recommended new entity:

- `WarehouseVariant`

Purpose:

- canonical variant identity for `product_catalog_id + variant_key`
- normalized attribute payload
- readable attribute summary
- stable referential target for stock, tasks, and scene objects

Minimum fields:

- `id`
- `orgId`
- `productCatalogId`
- `variantKey`
- `attributesJson`
- `attributesSummary`
- `isActive`
- `createdAt`
- `updatedAt`

### 8.4. Add canonical stock ledger

Current `warehouse_movements` is useful, but it is not enough for the final warehouse twin.

Recommended canonical entity:

- `WarehouseStockLedgerEvent`

Purpose:

- immutable stock mutation log
- source-backed mutation trace
- future replay foundation
- projection source for balances and occupancy

Minimum fields:

- `id`
- `orgId`
- `warehouseSiteId`
- `variantId`
- `fromBinId`
- `toBinId`
- `eventType`
- `qtyDelta`
- `statusFrom`
- `statusTo`
- `sourceType`
- `sourceId`
- `actorId`
- `actorName`
- `createdAt`

### 8.5. Add stock balance projection

Recommended projection entity:

- `WarehouseStockBalance`

Purpose:

- fast reads by variant / site / bin / status
- classic inventory tables
- spatial occupancy overlays

### 8.6. Add task and document entities

Recommended entities:

- `WarehouseDocument`
- `WarehouseDocumentLine`
- `WarehouseTask`
- `WarehouseTaskStep`
- `WarehouseRoute`
- `WarehouseRouteStop`
- `WarehouseExceptionCase`

### 8.7. Add spatial entities

Recommended entities:

- `WarehouseSpatialNode`
- `WarehouseSpatialTransform`
- `WarehouseLayoutVersion`
- `WarehouseLayoutChangeSet`
- `WarehouseSpatialConstraint`

### 8.8. Current-to-target mapping

| Current entity | Transitional role | Long-term role |
|---|---|---|
| `WarehouseLocation` | legacy location alias | compatibility only |
| `WarehouseItem` | stock balance + fallback read model | projection / summary row |
| `WarehouseMovement` | operational movement log | compatibility event log |
| `WarehouseProductCatalog` | product master | product master |
| `WarehouseFieldDefinition` | attribute schema | attribute schema |
| `ChapanOrderItem` legacy fields | compatibility payload | fallback / printable mirror |

---

## 9. Canonical state model

### 9.1. Variant identity

Reuse the current normalized variant-key approach as the seed of canonical variant identity:

- normalize product name
- normalize attribute values
- include only fields that affect availability when appropriate
- generate deterministic `variantKey`

This logic currently exists in `warehouse-catalog.service.ts` and must be extracted into a shared variant utility used by:

- warehouse catalog
- warehouse stock writes
- Chapan order writes
- availability checks
- document rendering

### 9.2. Stock truth

Final doctrine:

- stock truth lives in immutable ledger + validated balance projections
- UI never mutates stock directly
- 3D cannot “just change qty”
- direct balance counters remain transitional only

### 9.3. Layout truth

Final doctrine:

- live layout truth lives in published layout version
- draft layout truth lives in layout draft / change set
- scene rendering never becomes the source of truth

### 9.4. Task truth

Final doctrine:

- task state transitions are explicit and auditable
- task routing is recomputable
- scene markers are projections, not source state

---

## 10. Frontend target architecture

### 10.1. Page composition strategy

`src/pages/warehouse/index.tsx` must stop being a placeholder and become the warehouse shell page.

Recommended high-level composition:

- `WarehouseShellPage`
- `WarehouseClassicView`
- `WarehouseSpatialView`
- `WarehouseControlTowerView`
- `WarehouseSimulationView`
- `WarehouseReplayView`

### 10.2. Recommended frontend folder strategy

Keep existing `src/entities/warehouse/*` for API contracts and hooks.

Add feature-level UI modules:

- `src/features/warehouse/classic/*`
- `src/features/warehouse/spatial/*`
- `src/features/warehouse/control-tower/*`
- `src/features/warehouse/simulation/*`
- `src/features/warehouse/replay/*`
- `src/features/warehouse/model/*`
- `src/features/warehouse/shared/*`

### 10.3. State management doctrine

Use:

- **React Query** for server truth and projections
- **Zustand** for ephemeral UI state:
  - selected object
  - current mode
  - active overlay set
  - camera presets
  - minimap state
  - layout draft session state

Do not place high-frequency scene state in React Query cache.

### 10.4. 3D stack decision

Recommended decision:

- keep current workspace transition shell on the existing custom Three.js foundation
- build the warehouse twin scene using `@react-three/fiber` + `three`
- reuse KORT workspace visual tokens, theme, and entry animation vocabulary

Reason:

- existing workspace runtime already solves brand/world continuity
- R3F gives better component ergonomics for warehouse objects, overlays, and interaction
- this avoids an unnecessary engine switch

### 10.5. Workspace-to-warehouse transition

Desired flow:

1. user enters warehouse from workspace tile
2. workspace shell remains visually continuous
3. camera performs controlled zoom-in / dive transition
4. warehouse shell opens in `Classic` or `Spatial` mode based on entry intent
5. selected warehouse/site context is preserved

### 10.6. Spatial UX modes

Phase target modes:

- `Classic`
- `Spatial`
- `Control Tower`
- `Layout`
- `Simulation`
- `Replay`

### 10.7. Non-negotiable dual-mode bridge

Classic must offer:

- `Locate in Spatial`
- `Open zone/rack/bin`
- `Open task route`
- `Show occupancy`

Spatial must offer:

- `Open record in Classic`
- `Open ledger`
- `Open document`
- `Open task`
- `Open exception`

Without this bridge, the dual-mode promise fails.

---

## 11. Backend target architecture

### 11.1. Route strategy

Keep `/api/v1/warehouse` as the stable prefix.

Extend it by bounded contexts rather than by one giant file.

### 11.2. Recommended server module split

Current `warehouse.service.ts` is already too wide for the final warehouse system.

Recommended server split:

- `warehouse.catalog.service.ts`
- `warehouse.variant.service.ts`
- `warehouse.inventory.service.ts`
- `warehouse.structure.service.ts`
- `warehouse.document.service.ts`
- `warehouse.task.service.ts`
- `warehouse.spatial.service.ts`
- `warehouse.projection.service.ts`
- `warehouse.realtime.service.ts`
- `warehouse.audit.service.ts`

Route files can remain under one prefix but should be grouped similarly.

### 11.3. API groups by concern

#### Existing API that should be preserved

- `GET /warehouse/summary`
- `GET /warehouse/items`
- `GET /warehouse/movements`
- `GET /warehouse/alerts`
- `GET /warehouse/catalog/definitions`
- `GET /warehouse/catalog/products`
- `GET /warehouse/order-form/catalog`
- `POST /warehouse/availability/check-variant`

#### New structure API

- `GET /warehouse/sites`
- `POST /warehouse/sites`
- `GET /warehouse/sites/:id/structure`
- `POST /warehouse/zones`
- `PATCH /warehouse/zones/:id`
- `POST /warehouse/racks`
- `PATCH /warehouse/racks/:id`
- `POST /warehouse/bins`
- `PATCH /warehouse/bins/:id`

#### New operational API

- `POST /warehouse/documents`
- `POST /warehouse/documents/:id/post`
- `GET /warehouse/tasks`
- `POST /warehouse/tasks/:id/assign`
- `POST /warehouse/tasks/:id/accept`
- `POST /warehouse/tasks/:id/complete`
- `POST /warehouse/tasks/:id/exception`

#### New spatial API

- `GET /warehouse/spatial/scenes/:siteId`
- `GET /warehouse/spatial/object/:domainType/:domainId`
- `GET /warehouse/spatial/overlays/:overlayType`
- `POST /warehouse/spatial/layouts/:siteId/drafts`
- `PATCH /warehouse/spatial/layout-drafts/:id/nodes/:nodeId`
- `POST /warehouse/spatial/layout-drafts/:id/validate`
- `POST /warehouse/spatial/layout-drafts/:id/publish`

#### New control / replay / simulation API

- `GET /warehouse/control-tower/:siteId`
- `GET /warehouse/replay/events`
- `POST /warehouse/simulation/scenarios`
- `POST /warehouse/simulation/scenarios/:id/run`
- `GET /warehouse/simulation/scenarios/:id/results`

---

## 12. Realtime architecture

### 12.1. Transport doctrine

**[Proposed]** Use transport in layers as a pragmatic starting point, not as an absolute truth:

- **SSE first** for summary/projection/alert/task updates
- **WebSocket second** for high-frequency spatial streams:
  - worker positions
  - route recompute updates
  - scene-level activity

Reason:

- SSE already has a client hook in the repo
- WS infrastructure pattern already exists in the repo
- **[Likely]** warehouse does not need chat-like bidirectional realtime for every feature from day 1

Important caveat:

- collaborative draft editing
- worker movement telemetry
- live path reroute
- dense overlay patch streams

may force selected warehouse features onto WebSocket earlier than initially planned.

### 12.2. Suggested event families

#### Domain events

- `warehouse.site.created`
- `warehouse.zone.created`
- `warehouse.rack.moved`
- `warehouse.bin.blocked`
- `warehouse.variant.created`
- `warehouse.stock.received`
- `warehouse.stock.moved`
- `warehouse.stock.reserved`
- `warehouse.stock.released`
- `warehouse.layout.published`
- `warehouse.task.created`
- `warehouse.task.assigned`
- `warehouse.task.completed`
- `warehouse.exception.created`
- `warehouse.exception.resolved`

#### Projection events

- `projection.inventory.updated`
- `projection.occupancy.updated`
- `projection.task_load.updated`
- `projection.zone_heat.updated`
- `projection.warehouse_health.updated`

#### UI events

- `spatial.object.selected`
- `spatial.overlay.changed`
- `spatial.focus.changed`
- `layout.draft.validation_ready`

### 12.3. Realtime consumers

- warehouse summary widgets
- task board
- control tower
- spatial overlays
- workspace warehouse tile preview

---

## 13. Permissions model evolution

### 13.1. Current model

Current warehouse access is basically:

- org role
- `warehouse_manager`
- `observer`

This is enough for current gating, but not for a warehouse twin.

### 13.2. Recommended new permission flags

Recommended additions to `employee_permissions`:

- `warehouse_view`
- `warehouse_execute_tasks`
- `warehouse_manage_stock`
- `warehouse_manage_documents`
- `warehouse_manage_layout`
- `warehouse_publish_layout`
- `warehouse_control_tower`
- `warehouse_view_replay`
- `warehouse_run_simulation`

### 13.3. Backward compatibility

Keep `warehouse_manager` as umbrella permission in early phases:

- if `warehouse_manager` exists, map it to all warehouse permissions except maybe publish/simulation if stricter approval is desired
- if `observer` only, expose read-only classic and read-only spatial

### 13.4. Spatial-specific rule

No spatial editing should be available solely because the user can open warehouse pages.

Spatial edit and spatial publish must be separate capabilities.

---

## 14. Integration constraints

### 14.1. Chapan constraints

The warehouse roadmap must preserve:

- variant-aware order form dropdowns
- finished-goods availability checks
- BOM-based shortage checks
- warehouse vs production routing
- reservation release on terminal statuses

### 14.2. Accounting constraints

**[Verified]** The accounting module defines warehouse movement event types and a sync adapter for:

- `warehouse.movement_in`
- `warehouse.write_off`

**[Not yet verified as live warehouse coupling]** This document does not assume that the current warehouse write path is already consistently invoking that adapter.

**[Proposed]** Any future ledger refactor must preserve equivalent accounting emission, ideally behind a single inventory-posting adapter.

### 14.3. Print / document constraints

Current printable flows still rely heavily on legacy order fields. Therefore:

- `attributesSummary` should become the new printable bridge
- legacy field rendering must remain as fallback until templates are migrated

### 14.4. Import constraints

Existing import foundation exists in:

- `server/src/modules/imports/scanner/*`
- `server/src/modules/imports/adapters/warehouse.adapter.ts`

In addition:

- **[Verified]** smart catalog import routes already exist in `warehouse-catalog.routes.ts`
- **[Verified]** generic import foundations exist
- **[Not verified]** generic warehouse import routes are not confirmed as mounted production API in `server/src/app.ts`

**[Proposed]** warehouse twin rollout should not fork the import world into a second incompatible catalog, but this likely still requires refactoring of import ownership and route exposure.

### 14.5. Current actual DB schema diff vs target schema

This is the current repo-backed schema gap at a high level.

| Area | Current actual schema | Target schema | Gap type |
|---|---|---|---|
| Warehouse identity | no explicit warehouse site table | `WarehouseSite` | missing canonical structure root |
| Physical structure | `WarehouseLocation` only | zone / aisle / rack / shelf / bin hierarchy | major structural gap |
| Variant identity | `product_catalog_id`, `variant_key`, `attributes_json`, `attributes_summary` embedded in `warehouse_items` | explicit `WarehouseVariant` + snapshot fields on business records | canonical identity still implicit |
| Stock truth | mutable `warehouse_items.qty` and `qtyReserved`, plus `warehouse_movements` | immutable ledger + balance projections | major migration gap |
| Tasks/docs | warehouse tasks/docs not modeled as first-class tables | `WarehouseDocument*`, `WarehouseTask*`, `WarehouseExceptionCase` | missing operational core |
| Spatial | no warehouse spatial tables | spatial nodes / transforms / layout versions / constraints | missing twin core |
| Replay/simulation | no dedicated storage model | replay events / scenarios / snapshots | missing differentiator layer |

Design implication:

- current schema is enough to support P0/P1 convergence
- it is not enough to safely support full twin semantics without new canonical entities

### 14.6. Current actual API diff vs target API

**[Verified current API surface]** from `warehouse.routes.ts` and `warehouse-catalog.routes.ts`:

- summary
- categories CRUD
- locations CRUD
- items CRUD
- movements list/create
- BOM get/set/list
- product availability by name
- Chapan order BOM check / release reservations
- alerts list/resolve
- lots list/create
- catalog definitions/options/products CRUD
- default field seeding
- order-form catalog
- variant availability check
- smart imports / raw imports

**[Missing vs target API]**

- explicit warehouse sites/structure
- warehouse documents
- warehouse tasks/routes/exceptions
- spatial scene/object/layout endpoints
- control tower endpoints
- replay endpoints
- simulation endpoints
- warehouse-specific realtime endpoints

Execution implication:

- the current API is usable as a P0 base
- but it is still fundamentally an inventory/catalog API, not yet a full WMS API

### 14.7. Current actual warehouse service responsibilities vs proposed split

**[Verified current service distribution]**

`warehouse.service.ts` currently owns:

- categories
- locations
- items
- movements
- BOM
- Chapan shortage check
- reservations and release
- alerts
- lots
- summary

`warehouse-catalog.service.ts` currently owns:

- field definitions
- field options
- product catalog
- product-to-field mapping
- order-form catalog
- variant availability calculation
- default seeding
- smart imports / field option imports

**Problem**

Current boundaries are acceptable for a growing inventory module, but too wide for a twin-grade WMS.

**[Proposed split]**

- structure
- inventory
- catalog
- variant identity
- tasks
- documents
- exceptions
- spatial
- projections
- realtime

This split should happen before P2 spatial complexity lands.

### 14.8. Source-of-truth migration semantics for stock

This is the most dangerous migration area and must be explicitly governed.

#### 14.8.1. Migration phases

**Phase S0. Current truth**

- `warehouse_items.qty` and `qtyReserved` are the operational balances
- `warehouse_movements` is an operational log, not yet a full canonical ledger

**Phase S1. Dual-write introduction**

All stock-changing flows must move behind a single inventory orchestrator.

That orchestrator writes in one transaction:

1. validates command and permissions
2. checks idempotency
3. writes canonical ledger event(s)
4. updates canonical stock balance rows
5. updates transitional compatibility rows in `warehouse_items`
6. updates reservation state if relevant
7. writes outbox/realtime/audit records

**Phase S2. Read cutover**

- new warehouse screens read canonical balance projections
- compatibility endpoints may still read `warehouse_items` if needed
- `warehouse_items` is still updated, but only by the orchestrator

**Phase S3. Final truth**

- source of truth = canonical ledger + reservation model + stock balance projections
- `warehouse_items` becomes compatibility/projection-only or is retired later

#### 14.8.2. Writable vs projected semantics

**[Proposed]**

- during migration, `warehouse_items` may continue to be physically updated
- but it must stop being a free-form writable model
- only the inventory orchestrator may mutate it
- after parity is established, it becomes a compatibility projection, not truth

#### 14.8.3. Synchronous vs asynchronous posting

**[Proposed]** user-trust-critical writes must be synchronous:

- stock mutation commit
- reservation create/release
- document posting
- task completion that changes stock

These must return only after:

- ledger write succeeded
- canonical balance update succeeded
- compatibility balance update succeeded if still present

**Async lag is acceptable only for:**

- dashboards
- heatmaps
- control tower summaries
- replay aggregates
- non-critical overlays

#### 14.8.4. Existing service behavior during partial migration

**[Proposed]**

Current methods such as:

- `addMovement`
- `checkOrderBOM`
- `releaseOrderReservations`

should remain route-level contracts for some time, but internally become facades over:

- inventory command handlers
- reservation service
- projection readers

This preserves API stability while changing internals safely.

#### 14.8.5. Idempotency contract

This must be explicit before large-scale warehouse operations.

**[Proposed]**

Every stock mutation command must carry:

- `orgId`
- `idempotencyKey`
- `operationType`
- `sourceType`
- `sourceId`
- optional `sourceLineId`

Recommended uniqueness scopes:

- document post: unique per document
- reservation create: unique per `(sourceType, sourceId, variantId, active-state)`
- reservation release: unique per `(reservationId, releaseReason or releaseCommandId)`
- manual adjustment: unique per idempotency key

Implementation note:

- exact unique indexes depend on final schema
- but idempotency must be handled inside DB transaction, not only in API memory

### 14.9. Layout publish semantics under active operations

This is the second critical execution-safe contract.

#### 14.9.1. Layout change classes

**Class A. Non-structural**

- rename
- recolor
- visual metadata
- non-topological labels

These can publish while operations continue.

**Class B. Structural but non-disruptive**

- transform changes that do not affect occupied storage
- move/rotate elements not tied to active tasks or routes
- additive structure that does not break connectivity

These may publish if validation confirms no active operational impact.

**Class C. Structural disruptive**

- deleting or remapping occupied bins/racks
- shrinking capacity below current occupancy
- changing connectivity for active routes
- blocking aisles used by active tasks

These must not publish without coordinated migration/replanning.

#### 14.9.2. Hard blockers for publish

**[Proposed hard blockers]**

- collision after publish
- route graph partition
- inaccessible occupied bin
- stock-bearing node delete/remap without migration plan
- active task references invalid node after publish
- aisle width / emergency path violation
- unresolved stock-balance-to-structure mapping

#### 14.9.3. Can layout publish happen during active picks?

**[Proposed]**

- yes for Class A
- yes for Class B only if impacted nodes are empty and no active tasks/routes touch them
- no for Class C until impacted tasks are paused, rerouted, completed, or explicitly migrated

#### 14.9.4. Active routes and task migration

**[Proposed]**

- each route should be associated with the layout version under which it was computed
- on publish, impacted routes are invalidated and recomputed
- unimpacted routes continue
- impacted tasks enter one of:
  - auto-rerouted
  - supervisor review required
  - blocked until resolution

#### 14.9.5. Occupied bins/racks during structural edits

**[Proposed]**

Structural edits touching occupied nodes require a stock migration plan:

- pre-publish move plan generated
- or publish blocked

There must be no silent remap of stock from one structural object to another.

#### 14.9.6. Layout version vs stock balance projection

**[Proposed]**

- stock balances must be keyed by domain storage ids such as `binId`, not by visual node ids
- spatial nodes may be re-rendered or repositioned without changing stock truth
- deleting or remapping domain storage ids requires explicit stock migration events

This avoids coupling stock truth to scene representation.

### 14.10. Variant identity and schema evolution contract

This is the third critical contract.

#### 14.10.1. Canonical ownership

**[Verified current state]**

The current repo already places warehouse attribute schema inside:

- `WarehouseFieldDefinition`
- `WarehouseFieldOption`
- `WarehouseProductCatalog`

**[Proposed near-term doctrine]**

Within the warehouse scope, this warehouse catalog remains the canonical owner of:

- attribute schema
- product-to-attribute applicability
- availability-affecting attribute flags

If KORT later introduces a wider product master domain, warehouse can become a consumer of that master, but that is outside this spec.

#### 14.10.2. Variant key immutability

**[Proposed]**

- `variantKey` is immutable once stock, reservations, or business records reference it
- changing human labels does not change variant identity
- changing semantic identity rules creates a new variant key, not a silent rewrite of the old one

#### 14.10.3. Can variants be rebuilt retroactively?

**[Proposed]**

Only through explicit migration/backfill tooling with audit trail.

Not allowed in normal request-path logic.

#### 14.10.4. Field definition evolution

Not all field changes are equal.

**Safe changes**

- label text
- sort order
- UI visibility flags
- adding non-breaking options

**Breaking changes**

- changing `code`
- changing `inputType`
- changing `affectsAvailability`
- changing attribute semantics in a way that alters identity

**[Proposed]** breaking changes require either:

- new field definition version
- or new field definition/code with migration plan

#### 14.10.5. Historical order/item stability

**[Proposed]**

Every stock-bearing or order-bearing record should persist an immutable attribute snapshot:

- `variantKey`
- `attributesJson`
- `attributesSummary`
- `schemaVersion` or equivalent version marker

This ensures later catalog evolution does not rewrite historical business meaning.

### 14.11. Performance and storage economics

This document previously under-specified operational scale. That gap is closed here as a design envelope.

#### 14.11.1. Spatial node scale assumptions

**[Proposed planning envelopes]**

- small warehouse: `500–2,000` spatial nodes
- medium warehouse: `2,000–10,000`
- large warehouse: `10,000–50,000+`

These are planning envelopes, not repo-verified customer counts.

#### 14.11.2. Scene payload strategy

**[Proposed]**

- classic warehouse remains normal SPA UI
- spatial warehouse is CSR-only
- initial load should prefer:
  - scene manifest
  - visible zone chunks
  - overlay patch streams

not monolithic full-scene snapshots for medium/large warehouses.

Recommended payload structure:

- site manifest
- zone/aisle chunks
- overlay patches
- object-detail fetch on demand

#### 14.11.3. Snapshot vs chunk loading

**[Proposed]**

- full snapshot allowed for small sites and local/dev mode
- chunked loading required for larger sites
- minimap should use low-resolution aggregate geometry, not full scene detail

#### 14.11.4. Indexing strategy

**[Proposed baseline indexes]**

For canonical ledger:

- `(org_id, warehouse_site_id, created_at desc)`
- `(org_id, variant_id, created_at desc)`
- `(org_id, from_bin_id, created_at desc)`
- `(org_id, to_bin_id, created_at desc)`
- `(correlation_id)`
- `(idempotency_key unique)`

For balance/projection tables:

- `(org_id, warehouse_site_id, variant_id)`
- `(org_id, bin_id, stock_status)`
- `(org_id, zone_id, updated_at desc)`

#### 14.11.5. Replay retention policy

**[Proposed]**

- hot replay detail: `30–90 days`
- summarized operational metrics: longer retention
- cold archive for older ledger/event history if customer and compliance needs require it
- high-frequency telemetry such as worker movement may need shorter retention than stock ledger history

#### 14.11.6. Transport economics

**[Proposed]**

- dense scene overlay updates should ship as patches/deltas where possible
- avoid full projection invalidation for every node-level change
- realtime layer should distinguish:
  - critical mutation confirmations
  - aggregated projection refreshes
  - high-frequency telemetry
  - collaborative draft messages

---

## 15. Recommended release roadmap

Priority semantics:

- **P0**: no-regret foundational work; blockers for all future work
- **P1**: classic operational warehouse core
- **P2**: spatial twin foundation
- **P3**: live operations / control tower
- **P4**: layout editing and publish workflow
- **P5**: replay, simulation, intelligence

---

## 16. P0 — Foundation and convergence

### Goal

Turn warehouse from scattered partial foundations into one coherent product base without breaking current flows.

### P0.1. Activate the real warehouse page

**Outcome**

Replace the `/warehouse` placeholder with a real shell and wire in the existing catalog/inventory surfaces.

**Tasks**

- FE:
  - replace `src/pages/warehouse/index.tsx` placeholder with warehouse shell
  - mount `WarehouseCatalog.tsx` under a real tab or section
  - add `Overview`, `Catalog`, `Inventory`, `Movements`, `Alerts` tabs using current APIs
  - add permission-aware empty/read-only states
- FE:
  - fix or replace the broken warehouse tile preview dependency on missing `useWarehouseStore`
  - use React Query backed summary instead of a non-existent store if needed
- BE:
  - stabilize `/warehouse/summary` response contract
  - make sure summary endpoint includes everything needed by tile preview and landing view
- QA:
  - add first warehouse page smoke coverage

**Repo surface**

- `src/pages/warehouse/index.tsx`
- `src/pages/warehouse/WarehouseCatalog.tsx`
- `src/entities/warehouse/api.ts`
- `src/entities/warehouse/queries.ts`
- `src/features/workspace/widgets/warehouse/WarehouseTilePreview.tsx`

### P0.2. Canonical variant primitives and dual-write

**Outcome**

Unify variant identity across warehouse and Chapan.

**Tasks**

- BE:
  - extract shared variant normalization + `variantKey` builder from current catalog service
  - create canonical `attributesJson` serializer and `attributesSummary` renderer
  - extend order create/update service to write:
    - `variantKey`
    - `attributesJson`
    - `attributesSummary`
  - keep legacy fields mirrored from canonical attributes
- FE:
  - extend order form payload contract to carry generic attributes alongside legacy inputs
  - keep current UI compatible while canonical payload becomes primary
- QA:
  - add unit tests for variant key stability
  - add integration tests for create/edit order dual-write

**Repo surface**

- `server/src/modules/warehouse/warehouse-catalog.service.ts`
- `server/src/modules/chapan/orders.service.ts`
- `src/pages/workzone/chapan/orders/ChapanNewOrder.tsx`
- `src/entities/order/types.ts`
- `server/src/modules/chapan/types.ts`

### P0.3. Explicit warehouse site and structure seed

**Outcome**

Move from “warehouse by org assumption” to explicit warehouse entities.

**Tasks**

- DB:
  - add `WarehouseSite`
  - seed one default site per org
  - add minimal structure entities:
    - `WarehouseZone`
    - `WarehouseBin`
  - add compatibility mapping from `WarehouseLocation`
- BE:
  - create CRUD for sites / zones / bins
  - map legacy location names to default zone/bin on read where needed
- FE:
  - surface site selector in warehouse shell
  - keep default-site behavior invisible for orgs with only one site

### P0.4. Migration-safe inventory envelope

**Outcome**

Prepare current stock engine for future ledger migration without breaking accounting.

**Tasks**

- BE:
  - centralize stock mutation through a dedicated inventory service
  - centralize accounting side effects behind one adapter
  - stop direct ad hoc balance changes from spreading into unrelated modules
- QA:
  - add regression tests for:
    - stock in
    - stock out
    - reservation
    - release
    - accounting event emission

### P0 exit criteria

- `/warehouse` is a real page, not a placeholder
- current warehouse endpoints have stable contracts
- Chapan orders write canonical variant payloads
- a default warehouse site exists per org
- warehouse tile preview works from real data
- accounting sync for warehouse movements remains intact

---

## 17. P1 — Classic operational warehouse core

### Goal

Ship a serious non-spatial warehouse module first, so the spatial layer lands on solid operational ground.

### P1.1. Structure master data in classic mode

**Outcome**

Users can manage physical warehouse structure through enterprise forms before touching 3D.

**Tasks**

- DB:
  - expand structure hierarchy:
    - `WarehouseAisle`
    - `WarehouseRack`
    - `WarehouseShelf`
    - richer `WarehouseBin`
- BE:
  - CRUD + validation
  - capacity rules
  - blocked / maintenance statuses
- FE:
  - classic structure editor
  - hierarchy list/tree
  - search by zone/rack/bin code

### P1.2. Inventory ledger and projections

**Outcome**

Introduce canonical stock engine under the classic UI.

**Tasks**

- DB:
  - add `WarehouseVariant`
  - add `WarehouseStockLedgerEvent`
  - add `WarehouseStockBalance` projection
- BE:
  - create ledger writer
  - create balance projector
  - keep `warehouse_items` as transitional read model / compatibility projection
- FE:
  - new inventory overview by:
    - variant
    - bin
    - stock status
    - batch

### P1.3. Warehouse documents and task engine

**Outcome**

Warehouse operations become document- and task-driven.

**Tasks**

- DB:
  - `WarehouseDocument`
  - `WarehouseDocumentLine`
  - `WarehouseTask`
  - `WarehouseTaskStep`
  - `WarehouseExceptionCase`
- BE:
  - receiving
  - putaway
  - transfer
  - count
  - adjustment
  - replenishment trigger scaffolding
- FE:
  - classic task board
  - document hub
  - exception center basic

### P1.4. Chapan and finished-goods integration cutover

**Outcome**

Finished-goods availability and routing become variant-aware and warehouse-driven.

**Tasks**

- BE:
  - replace name-only availability fallback with variant-first checks wherever possible
  - allow warehouse site/bin awareness in finished-goods lookup
  - preserve BOM material checks for production
- FE:
  - show variant-aware stock badge in order form
  - show status:
    - `in_stock`
    - `low`
    - `out_of_stock`
    - `unknown`

### P1.5. First warehouse command dashboard

**Outcome**

The warehouse page already provides operational value even before 3D.

**Tasks**

- FE:
  - top KPI strip
  - low stock
  - active tasks
  - open exceptions
  - movement volume today
  - site health
- BE:
  - projection endpoint(s) for dashboard cards

### P1 exit criteria

- users can model warehouse structure in classic mode
- stock mutations are ledger-backed or ledger-ready
- warehouse tasks/documents exist as first-class concepts
- Chapan availability is variant-aware
- classic warehouse shell is operationally useful on its own

---

## 18. P2 — Spatial twin foundation

### Goal

Introduce a real warehouse twin as a read-first operational surface over the same warehouse truth.

### P2.1. Spatial scene bootstrap

**Outcome**

Warehouse structure can be rendered as a scene graph.

**Tasks**

- DB:
  - add `WarehouseSpatialNode`
  - add `WarehouseSpatialTransform`
- BE:
  - build scene payload serializer from structure entities
  - provide overlay payloads for occupancy and task load
- FE:
  - build `WarehouseSpatialView`
  - scene camera presets:
    - orbit
    - tactical top-down
    - focus-on-selection
  - object selection and context panel

### P2.2. Cross-mode navigation

**Outcome**

Classic and spatial become connected, not parallel.

**Tasks**

- FE:
  - `Locate in Spatial` from inventory/task/document rows
  - `Open in Classic` from spatial object cards
  - deep-link support via route params / query state
- BE:
  - spatial object lookup endpoint by domain object id

### P2.3. Spatial overlays

**Outcome**

The first spatial mode is operationally meaningful.

**Initial overlays**

- occupancy
- stock density
- task load
- blocked bins/zones
- route preview
- low-stock risk

### P2.4. Performance and fallback profile

**Outcome**

Spatial mode remains usable on normal enterprise hardware.

**Tasks**

- FE:
  - LOD strategy
  - optional shadow quality reduction
  - overlay throttling
  - simplified objects at scale
  - performance profile based on device capability

### P2 exit criteria

- warehouse structure renders from real data
- user can move from classic row to spatial object and back
- spatial overlays explain actual warehouse state
- scene performs acceptably on mainstream hardware

---

## 19. P3 — Realtime operations and control tower

### Goal

Make warehouse state live, not static.

### P3.1. Projection engine

**Outcome**

Warehouse gains dedicated operational projections.

**Projections**

- inventory projection
- location occupancy projection
- task load projection
- warehouse health projection
- zone heat projection
- alert feed projection

### P3.2. Event stream and subscriptions

**Outcome**

Warehouse UI updates from events rather than reload-heavy polling.

**Tasks**

- BE:
  - SSE channel for warehouse summary/task/alert updates
  - WS channel for high-frequency spatial updates
- FE:
  - React Query invalidation bridge from realtime events
  - live control tower cards
  - live scene overlay refresh

### P3.3. Control tower mode

**Outcome**

Supervisor sees live warehouse pressure and can intervene fast.

**Panels**

- incoming load
- outgoing load
- at-risk tasks
- zone hotspots
- open exceptions
- replenishment pressure
- staffing/labor distribution later

### P3.4. Replenishment and exception-first workflows

**Outcome**

Warehouse begins to act like a real operations system.

**Tasks**

- threshold-based replenishment tasks
- blocked-bin reroute warnings
- exception ownership and SLA timers
- emergency count from risky area

### P3 exit criteria

- control tower gives live warehouse health
- warehouse screens update through realtime events
- replenishment and exception workflows are visible and actionable

---

## 20. P4 — Spatial editing and layout publish workflow

### Goal

Turn spatial mode from read surface into a safe editing surface.

### P4.1. Layout drafts

**Outcome**

Spatial edits go into drafts, not directly into live layout.

**Tasks**

- DB:
  - `WarehouseLayoutVersion`
  - `WarehouseLayoutChangeSet`
  - `WarehouseSpatialConstraint`
- BE:
  - draft create / update / validate / publish / rollback
- FE:
  - layout mode
  - edit tools:
    - move rack
    - rotate rack
    - resize zone
    - add rack template
    - create bin grid

### P4.2. Validation engine

**Outcome**

Spatial edits remain enterprise-safe.

**Validation classes**

- collision
- aisle width violation
- connectivity break
- inaccessible bin
- occupied-node deletion
- forbidden adjacency
- task impact analysis

### P4.3. Publish workflow

**Outcome**

Layout changes are safe, reviewable, and reversible.

**Tasks**

- approval flow if permission model requires it
- impact sheet before publish
- rollback entry
- live scene refresh after publish

### P4 exit criteria

- users can edit layout in 3D draft mode
- every publish is validated and auditable
- rollback exists
- live tasks are not silently invalidated

---

## 21. P5 — Replay, simulation, intelligence

### Goal

Turn warehouse twin into a genuine product differentiator.

### P5.1. Replay

**Outcome**

User can scrub warehouse history and inspect causality.

**Replay layers**

- stock changes
- task transitions
- operator route later
- zone occupancy
- exception bursts

### P5.2. Simulation

**Outcome**

User can test changes before publishing.

**Scenario types**

- rack repositioning
- aisle width changes
- fast-moving zone relocation
- replenishment threshold changes
- route strategy changes

### P5.3. Predictive overlays

**Outcome**

Warehouse shows not only now-state, but future-risk state.

**Examples**

- projected pick-face depletion
- congestion forecast
- receiving overload forecast
- SLA risk heat

### P5.4. AI advisory

**Outcome**

AI suggests; it does not silently mutate truth.

**Examples**

- slotting advisor
- replenishment predictor
- dead stock risk
- layout improvement suggestion

### P5 exit criteria

- warehouse replay works from historical event streams
- simulation compares baseline vs draft
- predictive overlays surface meaningful future risk
- AI suggestions are explainable and non-destructive

---

## 22. Detailed task list by discipline

### 22.1. Database tasks

- add `WarehouseSite`
- add `WarehouseZone`
- add `WarehouseAisle`
- add `WarehouseRack`
- add `WarehouseShelf`
- add `WarehouseBin`
- add `WarehouseVariant`
- add `WarehouseStockLedgerEvent`
- add `WarehouseStockBalance`
- add `WarehouseDocument`
- add `WarehouseDocumentLine`
- add `WarehouseTask`
- add `WarehouseTaskStep`
- add `WarehouseRoute`
- add `WarehouseRouteStop`
- add `WarehouseExceptionCase`
- add `WarehouseSpatialNode`
- add `WarehouseSpatialTransform`
- add `WarehouseLayoutVersion`
- add `WarehouseLayoutChangeSet`
- add compatibility migration from `WarehouseLocation`
- seed default warehouse site per org
- index by `orgId`, `siteId`, `variantKey`, `binId`, `status`

### 22.2. Backend tasks

- split current warehouse service by bounded context
- extract shared variant utility
- centralize inventory mutation service
- centralize accounting sync adapter
- add structure CRUD
- add task engine
- add document engine
- add exception engine
- add projection builders
- add spatial scene serializer
- add layout draft validation service
- add replay event reader
- add simulation scenario executor
- add warehouse SSE channel
- add warehouse WS channel

### 22.3. Frontend tasks

- replace warehouse placeholder route
- build warehouse shell navigation
- build overview dashboard
- build classic inventory table
- build movements and alerts views
- mount smart catalog UI
- extend order form with canonical attributes payload
- add variant-aware stock badges
- build structure editor
- build task board
- build control tower
- build spatial scene shell
- add minimap
- add overlays
- add context cards
- add classic/spatial deep-link bridge
- add layout mode
- add replay timeline
- add simulation compare UI

### 22.4. UX / visual tasks

- define warehouse visual language separate from generic CRM pages
- define classic-to-spatial mode switch
- define workspace zoom-in transition
- define overlay color system
- define object selection states
- define risk highlighting rules
- define minimap behavior
- define x-ray / ghost mode
- define read-only vs editable spatial affordances

### 22.5. QA / testing tasks

- add unit tests for variant normalization
- add integration tests for order dual-write
- add service tests for stock mutation and reservation
- add service tests for structure CRUD validation
- add API tests for warehouse routes
- add e2e warehouse shell smoke test
- add e2e classic-to-spatial deep-link test
- add e2e permissions tests for warehouse read vs edit
- add performance budget test for spatial shell

### 22.6. Analytics tasks

- track mode entry: classic vs spatial
- track locate-in-spatial action
- track scene-to-action conversion
- track exception resolution time
- track average time to identify stock issue
- track usage of layout drafts and simulation scenarios

---

## 23. Acceptance criteria by release

### P0 acceptance

- warehouse route is real and usable
- canonical variant payload is persisted
- default warehouse site exists
- current warehouse flows remain stable

### P1 acceptance

- classic warehouse handles real operations
- structure hierarchy exists
- task/document/exception core exists
- variant-aware Chapan integration is real

### P2 acceptance

- warehouse structure renders in 3D from real data
- dual-mode bridge works
- overlays are based on live projections

### P3 acceptance

- control tower works from realtime streams
- warehouse health is live
- replenishment/exception interventions are visible

### P4 acceptance

- spatial edits happen in drafts
- validation blocks bad publishes
- publish/rollback are auditable

### P5 acceptance

- replay is useful for investigation
- simulation produces meaningful diffs
- predictive overlays and AI remain advisory, not destructive

---

## 24. Risks and mitigation

### 24.1. Product risks

**Risk:** 3D becomes a demo layer.  
**Mitigation:** classic/spatial bridge is mandatory; no “view-only forever” after P2.

**Risk:** warehouse becomes overloaded with modes.  
**Mitigation:** release modes progressively; default entry remains simple.

### 24.2. Technical risks

**Risk:** current flat warehouse model cannot absorb structure complexity.  
**Mitigation:** explicit site/zone/bin entities in P0/P1; compatibility mapping from legacy location.

**Risk:** stock integrity breaks during ledger migration.  
**Mitigation:** dual-write and projection-first migration; preserve compatibility endpoints.

**Risk:** accounting side effects break.  
**Mitigation:** central accounting sync adapter; dedicated regression tests.

**Risk:** spatial performance is poor.  
**Mitigation:** view-first spatial rollout, LOD, profile-based rendering, overlay throttling.

### 24.3. Organizational risks

**Risk:** users reject 3D as “toy UX”.  
**Mitigation:** classic mode first, premium restrained visual language, measurable operational use cases.

---

## 25. Architecture decisions

### ADR-01. No Unreal Engine for primary warehouse frontend

Decision:

- primary warehouse frontend stays web-native
- use current React + TS + Three.js ecosystem

### ADR-02. Explicit warehouse site is mandatory

Decision:

- current org-scoped implicit warehouse assumption is not enough
- add warehouse site entity early

### ADR-03. Dual-write before read cutover

Decision:

- canonical attributes and variant identity are written first
- legacy readers remain until migrated

### ADR-04. SSE first, WebSocket second as the initial default

Decision:

- use existing SSE infrastructure for low-frequency realtime
- add WS for spatial high-frequency streams later
- revisit this per feature if collaborative editing or telemetry density pushes WS earlier

### ADR-05. Hybrid 3D strategy

Decision:

- workspace transition layer reuses current custom Three runtime
- warehouse twin scene is built with R3F-friendly component architecture

---

## 26. Recommended immediate implementation order

If execution starts now, the correct order is:

1. Replace the warehouse placeholder page and mount current functional surfaces.
2. Extract canonical variant utility and dual-write order/warehouse payloads.
3. Add explicit warehouse site + minimal structure seed.
4. Split warehouse backend by domain responsibilities.
5. Build classic structure/inventory/task shell.
6. Only then start spatial scene bootstrap.

This ordering is critical.

If KORT starts with the 3D scene before P0/P1 convergence, the result will almost certainly be:

- a pretty scene
- weak inventory truth
- fragile integration with Chapan
- no safe publish model
- rising regression cost

---

## 27. Final doctrine

KORT Warehouse succeeds only if both of these remain true at the same time:

1. **business operations remain strict, auditable, and compatible with current KORT flows**
2. **spatial interaction becomes genuinely useful and edits the same reality**

The implementation target is therefore:

- one warehouse truth
- one inventory logic
- one task engine
- one exception model
- one layout version system
- two equally valid interfaces

That is the actual product pillar.
