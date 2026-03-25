import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { normalizeProductionStatus } from './workflow.js';

type CreateOrderInput = {
  clientId?: string;
  clientName: string;
  clientPhone: string;
  priority: string;
  items: Array<{
    productName: string;
    fabric?: string;
    size: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    workshopNotes?: string;
  }>;
  dueDate?: string;
  prepayment?: number;
  paymentMethod?: string;
  mixedBreakdown?: {
    mixedCash: number;
    mixedKaspiQr: number;
    mixedKaspiTerminal: number;
    mixedTransfer: number;
  };
  managerNote?: string;
  sourceRequestId?: string;
};

type OrderRecord = Prisma.ChapanOrderGetPayload<{
  include: {
    items: true;
    productionTasks: true;
    payments: true;
    transfer: true;
    activities: true;
  };
}>;

// ── Helpers ─────────────────────────────────────────────

async function nextOrderNumber(orgId: string): Promise<string> {
  const profile = await prisma.chapanProfile.findUnique({ where: { orgId } });
  const prefix = (profile?.orderPrefix ?? 'ЧП').trim().slice(0, 6).toUpperCase();
  const counter = (profile?.orderCounter ?? 0) + 1;

  await prisma.chapanProfile.update({
    where: { orgId },
    data: { orderCounter: counter },
  });

  return `${prefix}-${String(counter).padStart(3, '0')}`;
}

function computePaymentStatus(paidAmount: number, totalAmount: number): string {
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0) return 'partial';
  return 'not_paid';
}

function getOrderStatusLabel(status: string) {
  if (status === 'new') return 'Новый';
  if (status === 'confirmed') return 'Подтвержден';
  if (status === 'in_production') return 'В производстве';
  if (status === 'ready') return 'Готово';
  if (status === 'transferred') return 'Передан';
  if (status === 'completed') return 'Завершен';
  if (status === 'cancelled') return 'Отменен';
  return status;
}

function formatPaymentMethod(method: string) {
  if (method === 'cash') return 'РќР°Р»РёС‡РЅС‹Рµ';
  if (method === 'card') return 'РљР°СЂС‚Р°';
  if (method === 'kaspi_qr') return 'Kaspi QR';
  if (method === 'kaspi_terminal') return 'Kaspi РўРµСЂРјРёРЅР°Р»';
  if (method === 'transfer') return 'РџРµСЂРµРІРѕРґ';
  if (method === 'mixed') return 'РЎРјРµС€Р°РЅРЅР°СЏ РѕРїР»Р°С‚Р°';
  return method;
}

function buildMixedPaymentNote(mixedBreakdown: NonNullable<CreateOrderInput['mixedBreakdown']>) {
  const parts = [
    { method: 'cash', amount: mixedBreakdown.mixedCash },
    { method: 'kaspi_qr', amount: mixedBreakdown.mixedKaspiQr },
    { method: 'kaspi_terminal', amount: mixedBreakdown.mixedKaspiTerminal },
    { method: 'transfer', amount: mixedBreakdown.mixedTransfer },
  ]
    .filter((part) => part.amount > 0)
    .map((part) => `${formatPaymentMethod(part.method)}: ${part.amount.toLocaleString('ru-RU')} ₸`);

  return parts.length > 0 ? parts.join('; ') : undefined;
}

function buildInitialPaymentNote(data: CreateOrderInput) {
  if (data.paymentMethod !== 'mixed' || !data.mixedBreakdown) {
    return undefined;
  }

  return buildMixedPaymentNote(data.mixedBreakdown);
}

function mapOrder(order: OrderRecord) {
  return {
    ...order,
    productionTasks: order.productionTasks.map((task) => ({
      ...task,
      status: normalizeProductionStatus(task.status),
    })),
    payments: order.payments.map((payment) => ({
      ...payment,
      note: payment.notes ?? null,
      createdAt: payment.paidAt,
      authorName: '',
    })),
    transfer: order.transfer
      ? {
          ...order.transfer,
          status: order.transfer.transferredAt ? 'transferred' : 'pending_confirmation',
          managerConfirmed: order.transfer.confirmedByManager,
          clientConfirmed: order.transfer.confirmedByClient,
          createdAt: order.transfer.transferredAt,
        }
      : null,
  };
}

async function resolveOrderClient(
  tx: Prisma.TransactionClient,
  orgId: string,
  data: Pick<CreateOrderInput, 'clientId' | 'clientName' | 'clientPhone'>,
) {
  const clientId = data.clientId?.trim();
  const clientName = data.clientName.trim();
  const clientPhone = data.clientPhone.trim();

  if (!clientName) {
    throw new ValidationError('Укажите имя клиента');
  }
  if (!clientPhone) {
    throw new ValidationError('Укажите телефон клиента');
  }

  if (clientId) {
    const client = await tx.chapanClient.findFirst({
      where: { id: clientId, orgId },
    });

    if (!client) {
      throw new ValidationError('Выбранный клиент не найден в текущей организации');
    }

    return {
      clientId: client.id,
      clientName,
      clientPhone,
    };
  }

  const existingClient = await tx.chapanClient.findFirst({
    where: { orgId, phone: clientPhone },
    orderBy: { createdAt: 'desc' },
  });

  if (existingClient) {
    return {
      clientId: existingClient.id,
      clientName,
      clientPhone,
    };
  }

  const createdClient = await tx.chapanClient.create({
    data: {
      orgId,
      fullName: clientName,
      phone: clientPhone,
    },
  });

  return {
    clientId: createdClient.id,
    clientName,
    clientPhone,
  };
}

// ── List orders ─────────────────────────────────────────

export async function list(orgId: string, filters?: {
  status?: string;
  statuses?: string[];
  priority?: string;
  paymentStatus?: string;
  search?: string;
  sortBy?: string;
  archived?: boolean;
}) {
  const where: Record<string, unknown> = { orgId };

  if (filters?.archived === true) {
    where.isArchived = true;
  } else {
    where.isArchived = false;
  }

  if (filters?.statuses && filters.statuses.length > 0) {
    where.status = { in: filters.statuses };
  } else if (filters?.status && filters.status !== 'all') {
    where.status = filters.status;
  }
  if (filters?.priority && filters.priority !== 'all') {
    where.priority = filters.priority;
  }
  if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
    where.paymentStatus = filters.paymentStatus;
  }
  if (filters?.search) {
    const q = filters.search.trim();
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { clientName: { contains: q, mode: 'insensitive' } },
      { items: { some: { productName: { contains: q, mode: 'insensitive' } } } },
    ];
  }

  const orderBy: Record<string, string> = {};
  switch (filters?.sortBy) {
    case 'dueDate': orderBy.dueDate = 'asc'; break;
    case 'totalAmount': orderBy.totalAmount = 'desc'; break;
    case 'updatedAt': orderBy.updatedAt = 'desc'; break;
    default: orderBy.createdAt = 'desc';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = await prisma.chapanOrder.findMany({
    where: where as any,
    orderBy,
    include: {
      items: true,
      productionTasks: true,
      payments: true,
      transfer: true,
      activities: { orderBy: { createdAt: 'desc' } },
    },
  });

  return orders.map(mapOrder);
}

// ── Get single order ────────────────────────────────────

export async function getById(orgId: string, id: string) {
  const order = await prisma.chapanOrder.findFirst({
    where: { id, orgId },
    include: {
      items: true,
      productionTasks: true,
      payments: true,
      transfer: true,
      activities: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!order) throw new NotFoundError('ChapanOrder', id);
  return mapOrder(order);
}

// ── Create order ────────────────────────────────────────

export async function create(orgId: string, authorId: string, authorName: string, data: CreateOrderInput) {
  const orderNumber = await nextOrderNumber(orgId);
  const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const prepayment = Math.max(0, data.prepayment ?? 0);
  const paymentMethod = data.paymentMethod?.trim() || 'cash';
  const paymentNote = buildInitialPaymentNote(data);

  return prisma.$transaction(async (tx) => {
    const client = await resolveOrderClient(tx, orgId, data);
    const activityEntries: Prisma.ChapanActivityCreateWithoutOrderInput[] = [
      {
        type: 'system',
        content: 'Заказ создан',
        authorId,
        authorName,
      },
    ];

    if (prepayment > 0) {
      activityEntries.push({
        type: 'payment',
        content: `РџСЂРµРґРѕРїР»Р°С‚Р° ${prepayment.toLocaleString('ru-RU')} в‚ё (${formatPaymentMethod(paymentMethod)})`,
        authorId,
        authorName,
      });
    }

    if (data.managerNote?.trim()) {
      activityEntries.push({
        type: 'comment',
        content: data.managerNote.trim(),
        authorId,
        authorName,
      });
    }

    const order = await tx.chapanOrder.create({
      data: {
        orgId,
        orderNumber,
        clientId: client.clientId,
        clientName: client.clientName,
        clientPhone: client.clientPhone,
        priority: data.priority,
        totalAmount,
        paidAmount: prepayment,
        paymentStatus: computePaymentStatus(prepayment, totalAmount),
        internalNote: data.managerNote?.trim() || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        items: {
          create: data.items.map((item) => ({
            productName: item.productName,
            fabric: item.fabric?.trim() || '',
            size: item.size,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes,
            workshopNotes: item.workshopNotes,
          })),
        },
        payments: prepayment > 0 ? {
          create: {
            amount: prepayment,
            method: paymentMethod,
            notes: paymentNote,
          },
        } : undefined,
        activities: {
          create: activityEntries,
        },
      },
      include: {
        items: true,
        productionTasks: true,
        payments: true,
        transfer: true,
        activities: true,
      },
    });

    if (data.sourceRequestId) {
      await tx.chapanRequest.updateMany({
        where: { id: data.sourceRequestId, orgId },
        data: { status: 'converted', createdOrderId: order.id },
      });
    }

    return mapOrder(order);
  });
}

// ── Confirm order (creates production tasks) ────────────

export async function confirm(orgId: string, id: string, authorId: string, authorName: string) {
  const order = await prisma.chapanOrder.findFirst({
    where: { id, orgId },
    include: { items: true },
  });
  if (!order) throw new NotFoundError('ChapanOrder', id);
  if (order.status !== 'new') throw new ValidationError('Only new orders can be confirmed');

  await prisma.$transaction(async (tx) => {
    await tx.chapanOrder.update({
      where: { id },
      data: { status: 'confirmed' },
    });

    // Auto-create production tasks from items
    for (const item of order.items) {
      await tx.chapanProductionTask.create({
        data: {
          orderId: id,
          orderItemId: item.id,
          productName: item.productName,
          fabric: item.fabric ?? '',
          size: item.size,
          quantity: item.quantity,
          status: 'queued',
        },
      });
    }

    await tx.chapanActivity.create({
      data: {
        orderId: id,
        type: 'status_change',
        content: 'Новый → Подтверждён',
        authorId,
        authorName,
      },
    });
  });

  // After confirmation: async warehouse BOM check (non-blocking)
  // If BOM is set up, this will auto-reserve materials or block tasks on shortage
  try {
    const { checkOrderBOM } = await import('../warehouse/warehouse.service.js');
    await checkOrderBOM(orgId, id, true);
  } catch {
    // Warehouse module may not have BOM set up yet — not a fatal error
  }
}

// ── Update order status ─────────────────────────────────

export async function updateStatus(orgId: string, id: string, status: string, authorId: string, authorName: string, cancelReason?: string) {
  const order = await prisma.chapanOrder.findFirst({ where: { id, orgId } });
  if (!order) throw new NotFoundError('ChapanOrder', id);
  if (order.isArchived) throw new ValidationError('Сначала восстановите заказ из архива');

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.chapanOrder.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'completed' ? now : null,
        cancelledAt: status === 'cancelled' ? now : null,
        cancelReason: status === 'cancelled' ? cancelReason : null,
      },
    });

    await tx.chapanActivity.create({
      data: {
        orderId: id,
        type: 'status_change',
        content: `${getOrderStatusLabel(order.status)} → ${getOrderStatusLabel(status)}`,
        authorId,
        authorName,
      },
    });
  });

  // Release warehouse reservations on terminal statuses
  if (status === 'cancelled' || status === 'completed') {
    try {
      const { releaseOrderReservations } = await import('../warehouse/warehouse.service.js');
      await releaseOrderReservations(orgId, id);
    } catch {
      // Warehouse module may not have reservations — not fatal
    }
  }
}

// ── Add payment ─────────────────────────────────────────

export async function addPayment(orgId: string, orderId: string, authorId: string, authorName: string, data: {
  amount: number;
  method: string;
  notes?: string;
}) {
  const order = await prisma.chapanOrder.findFirst({ where: { id: orderId, orgId } });
  if (!order) throw new NotFoundError('ChapanOrder', orderId);

  const newPaidAmount = order.paidAmount + data.amount;

  const [payment] = await prisma.$transaction([
    prisma.chapanPayment.create({
      data: {
        orderId,
        amount: data.amount,
        method: data.method,
        notes: data.notes,
      },
    }),
    prisma.chapanOrder.update({
      where: { id: orderId },
      data: {
        paidAmount: newPaidAmount,
        paymentStatus: computePaymentStatus(newPaidAmount, order.totalAmount),
      },
    }),
    prisma.chapanActivity.create({
      data: {
        orderId,
        type: 'payment',
        content: `Оплата ${data.amount.toLocaleString('ru-RU')} ₸ (${formatPaymentMethod(data.method)})`,
        authorId,
        authorName,
      },
    }),
  ]);

  return {
    ...payment,
    note: payment.notes ?? null,
    createdAt: payment.paidAt,
    authorName,
  };
}

// ── Transfer ────────────────────────────────────────────

export async function initiateTransfer(orgId: string, orderId: string) {
  const order = await prisma.chapanOrder.findFirst({ where: { id: orderId, orgId } });
  if (!order) throw new NotFoundError('ChapanOrder', orderId);

  return prisma.chapanTransfer.create({
    data: { orderId },
  });
}

export async function confirmTransfer(orgId: string, orderId: string, by: 'manager' | 'client', authorId: string, authorName: string) {
  const order = await prisma.chapanOrder.findFirst({
    where: { id: orderId, orgId },
    include: { transfer: true },
  });
  if (!order?.transfer) throw new NotFoundError('ChapanTransfer');

  const updateData: Record<string, unknown> = {};
  if (by === 'manager') updateData.confirmedByManager = true;
  if (by === 'client') updateData.confirmedByClient = true;

  const updated = await prisma.chapanTransfer.update({
    where: { id: order.transfer.id },
    data: updateData,
  });

  // Both confirmed → mark as transferred
  const bothConfirmed =
    (by === 'manager' ? true : order.transfer.confirmedByManager) &&
    (by === 'client' ? true : order.transfer.confirmedByClient);

  if (bothConfirmed) {
    await prisma.$transaction([
      prisma.chapanTransfer.update({
        where: { id: order.transfer.id },
        data: { transferredAt: new Date() },
      }),
      prisma.chapanOrder.update({
        where: { id: orderId },
        data: { status: 'transferred' },
      }),
      prisma.chapanActivity.create({
        data: {
          orderId,
          type: 'transfer',
          content: 'Передача подтверждена',
          authorId,
          authorName,
        },
      }),
    ]);
  }

  return updated;
}

// ── Update order ────────────────────────────────────────

type UpdateOrderInput = {
  clientName?: string;
  clientPhone?: string;
  dueDate?: string | null;
  priority?: string;
  items?: Array<{
    productName: string;
    fabric?: string;
    size: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    workshopNotes?: string;
  }>;
};

export async function update(orgId: string, id: string, authorId: string, authorName: string, data: UpdateOrderInput) {
  const order = await prisma.chapanOrder.findFirst({ where: { id, orgId }, include: { items: true } });
  if (!order) throw new NotFoundError('ChapanOrder', id);
  if (['completed', 'cancelled'].includes(order.status)) {
    throw new ValidationError('Завершённый или отменённый заказ нельзя редактировать');
  }
  if (data.items && order.status !== 'new') {
    throw new ValidationError('Позиции можно изменить только у заказов со статусом "Новый"');
  }

  return prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {};
    if (data.clientName) updateData.clientName = data.clientName.trim();
    if (data.clientPhone) updateData.clientPhone = data.clientPhone.trim();
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.priority) updateData.priority = data.priority;

    if (data.items) {
      const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      updateData.totalAmount = totalAmount;
      updateData.paymentStatus = computePaymentStatus(order.paidAmount, totalAmount);

      await tx.chapanOrderItem.deleteMany({ where: { orderId: id } });
      for (const item of data.items) {
        await tx.chapanOrderItem.create({
          data: {
            orderId: id,
            productName: item.productName,
            fabric: item.fabric?.trim() || '',
            size: item.size,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes,
            workshopNotes: item.workshopNotes,
          },
        });
      }
    }

    const updated = await tx.chapanOrder.update({
      where: { id },
      data: updateData,
      include: { items: true, productionTasks: true, payments: true, transfer: true, activities: { orderBy: { createdAt: 'desc' } } },
    });

    await tx.chapanActivity.create({
      data: { orderId: id, type: 'edit', content: 'Заказ отредактирован', authorId, authorName },
    });

    return mapOrder(updated);
  });
}

// ── Restore cancelled order ──────────────────────────────

export async function restore(orgId: string, id: string, authorId: string, authorName: string) {
  const order = await prisma.chapanOrder.findFirst({ where: { id, orgId } });
  if (!order) throw new NotFoundError('ChapanOrder', id);
  const isCancelled = order.status === 'cancelled' || order.status === 'canceled';
  const isArchived = order.isArchived;
  if (!isCancelled && !isArchived) {
    throw new ValidationError('Только отменённые или архивные заказы можно восстановить');
  }

  await prisma.$transaction(async (tx) => {
    const restoreData: Prisma.ChapanOrderUpdateInput = {
      isArchived: false,
      archivedAt: null,
    };

    // Cancelled orders go back to "new"; completed orders are just unarchived.
    if (isCancelled) {
      restoreData.status = 'new';
      restoreData.cancelReason = null;
      restoreData.cancelledAt = null;
    }

    await tx.chapanOrder.update({
      where: { id },
      data: restoreData,
    });

    await tx.chapanActivity.create({
      data: { orderId: id, type: 'status_change', content: 'Заказ восстановлен', authorId, authorName },
    });
  });
}

// ── Archive order ────────────────────────────────────────

export async function archive(orgId: string, id: string, authorId: string, authorName: string) {
  const order = await prisma.chapanOrder.findFirst({ where: { id, orgId } });
  if (!order) throw new NotFoundError('ChapanOrder', id);
  if (!['completed', 'cancelled'].includes(order.status)) {
    throw new ValidationError('Архивировать можно только завершённые или отменённые заказы');
  }

  await prisma.$transaction(async (tx) => {
    await tx.chapanOrder.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { isArchived: true, archivedAt: new Date() } as any,
    });

    await tx.chapanActivity.create({
      data: { orderId: id, type: 'system', content: 'Заказ перемещён в архив', authorId, authorName },
    });
  });
}

// ── Add activity ────────────────────────────────────────

export async function close(orgId: string, id: string, authorId: string, authorName: string) {
  const order = await prisma.chapanOrder.findFirst({ where: { id, orgId } });
  if (!order) throw new NotFoundError('ChapanOrder', id);
  if (order.isArchived) throw new ValidationError('Заказ уже находится в архиве');
  if (!['ready', 'transferred', 'completed'].includes(order.status)) {
    throw new ValidationError('Закрыть сделку можно только по готовому заказу');
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.chapanOrder.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: order.completedAt ?? now,
        isArchived: true,
        archivedAt: now,
      },
    });

    await tx.chapanActivity.create({
      data: {
        orderId: id,
        type: 'system',
        content: 'Сделка закрыта, заказ завершен и перемещен в архив',
        authorId,
        authorName,
      },
    });
  });

  try {
    const { releaseOrderReservations } = await import('../warehouse/warehouse.service.js');
    await releaseOrderReservations(orgId, id);
  } catch {
    // Warehouse module may not have reservations — not fatal
  }
}

export async function addActivity(orgId: string, orderId: string, authorId: string, authorName: string, data: {
  type: string;
  content: string;
}) {
  const order = await prisma.chapanOrder.findFirst({ where: { id: orderId, orgId } });
  if (!order) throw new NotFoundError('ChapanOrder', orderId);

  return prisma.chapanActivity.create({
    data: {
      orderId,
      type: data.type,
      content: data.content,
      authorId,
      authorName,
    },
  });
}
