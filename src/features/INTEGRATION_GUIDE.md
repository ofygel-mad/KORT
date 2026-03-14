# Cross-SPA Architecture — Integration Guide

## Схема потоков данных

```
┌──────────────┐   leadConverted   ┌──────────────┐
│  Leads SPA   │ ────────────────► │  Deals SPA   │
│              │ ◄──────────────── │              │
│  (qualifier) │   dealReturned    │  (pipeline)  │
└──────┬───────┘                   └──────┬───────┘
       │                                  │
       │ snapshot (leads)                 │ snapshot (deals)
       │                                  │ dealWon / dealLost
       ▼                                  ▼
┌──────────────────────────────────────────────────┐
│                   shared-bus                      │
│  (Zustand store, no persistence, zero coupling)  │
└──────┬──────────────────────────┬────────────────┘
       │ snapshot (tasks)          │ taskRequest
       │ taskDone                  │
       ▼                           ▼
┌──────────────┐             ┌──────────────┐
│  Tasks SPA   │             │  Tasks SPA   │
│              │             │  (receives   │
│  publishes   │             │   pre-filled │
│  on complete │             │   create     │
└──────────────┘             │   modal)     │
                             └──────────────┘
                                    │
                              snapshot (tasks)
                                    │
                                    ▼
                        ┌──────────────────────┐
                        │     Summary SPA       │
                        │                       │
                        │  Aggregates all       │
                        │  snapshots +          │
                        │  live event feeds     │
                        │                       │
                        │  Extension slots for  │
                        │  future SPAs          │
                        └──────────────────────┘
```

## Очереди шины

| Очередь             | Publisher   | Consumer(s)       | Данные                                   |
|---------------------|-------------|-------------------|------------------------------------------|
| `leadConvertedQueue`| Leads SPA   | Deals SPA         | Лид передан → создать сделку             |
| `dealReturnedQueue` | Deals SPA   | Leads SPA         | Сделка слита → вернуть в воронку лидов   |
| `dealWonQueue`      | Deals SPA   | Summary SPA       | Сделка выиграна (для live-ленты)         |
| `dealLostQueue`     | Deals SPA   | Summary SPA       | Сделка проиграна (для live-ленты)        |
| `taskRequestQueue`  | Any SPA     | Tasks SPA         | Создать задачу с пред-заполнением        |
| `taskDoneQueue`     | Tasks SPA   | Summary SPA       | Задача завершена (для live-ленты)        |
| `snapshotQueue`     | All SPAs    | Summary SPA       | Статистический слепок данных SPA         |

## Как добавить новый SPA

### 1. Создать SPA
```
features/
  my-new-spa/
    api/types.ts        ← domain types
    api/mock.ts         ← mock data, replace with fetch()
    model/my.store.ts   ← Zustand store
    components/         ← React components
    index.tsx           ← SPA shell
```

### 2. Добавить тип снэпшота в shared-bus
```typescript
// В features/shared-bus/index.ts добавить в union SpaSnapshot:
| {
    source: 'my-new-spa';
    // ...ваши поля
    snapshotAt: string;
  }
```

### 3. Публиковать снэпшоты из store
```typescript
// В my.store.ts после каждого изменения данных:
useSharedBus.getState().publishSnapshot({
  source: 'my-new-spa',
  // ...данные
  snapshotAt: new Date().toISOString(),
});
```

### 4. Summary автоматически подхватит новый источник
В `summary.store.ts` метод `processSnapshots()` складывает
неизвестные источники в `extraSnaps[source]`.
Summary SPA отображает их в «Extension slot» — без изменения
существующего кода.

Для кастомного виджета:
1. Добавить обработку нового `source` в `processSnapshots()`
2. Создать виджет-компонент в `summary-spa/components/widgets/`
3. Добавить его в `SummarySPA/index.tsx`

### 5. Публиковать `taskRequest` для создания задач
```typescript
useSharedBus.getState().publishTaskRequest({
  sourceSpа: 'my-new-spa',
  linkedEntityType: 'deal',
  linkedEntityId: deal.id,
  linkedEntityTitle: deal.title,
  suggestedTitle: 'Задача по сделке',
  priority: 'high',
});
// Tasks SPA откроет модал создания с пред-заполнением
```

## Правила изоляции

- **SPA никогда не импортируют store другого SPA**
- Весь обмен — исключительно через `features/shared-bus/index.ts`
- Каждый SPA компилируется и тестируется независимо
- Shared-bus не имеет persistence — данные живут только в памяти сессии

## Файловая структура

```
features/
  shared-bus/
    index.ts                   ← единая шина (Zustand, no persist)
  leads-spa/
    api/types.ts
    api/mock.ts
    model/leads.store.ts       ← +PATCH: publishSnapshot
    components/…
    index.tsx
  deals-spa/
    api/types.ts
    api/mock.ts
    model/deals.store.ts       ← обновлён: publishSnapshot, dealLost
    components/…
    index.tsx
  tasks-spa/
    api/types.ts               ← NEW
    api/mock.ts                ← NEW
    model/tasks.store.ts       ← NEW
    components/
      board/KanbanBoard.tsx    ← NEW
      board/TaskCard.tsx       ← NEW
      drawer/TaskDrawer.tsx    ← NEW
      modals/CreateTaskModal.tsx ← NEW
    views/ListView.tsx         ← NEW
    index.tsx                  ← NEW
  summary-spa/
    api/types.ts               ← NEW
    api/mock.ts                ← NEW
    model/summary.store.ts     ← NEW — агрегирует все снэпшоты
    components/
      widgets/KpiCards.tsx     ← NEW
      widgets/DealsWidget.tsx  ← NEW
      widgets/TasksWidget.tsx  ← NEW
      widgets/LeadsWidget.tsx  ← NEW
    charts/
      RevenueTrend.tsx         ← NEW
    index.tsx                  ← NEW
```
