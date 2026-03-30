import { useEffect, useId, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Calculator, ChevronLeft, Plus, Trash2, X } from 'lucide-react';
import { useOrder, useUpdateOrder, useChapanCatalogs, useRequestItemChange } from '../../../../entities/order/queries';
import type { Urgency } from '../../../../entities/order/types';
import { formatPersonNameInput } from '../../../../shared/utils/person';
import { formatKazakhPhoneInput, isKazakhPhoneComplete } from '../../../../shared/utils/kz';
import styles from './ChapanNewOrder.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const CITIES   = ['Алматы', 'Астана', 'Шымкент', 'Атырау', 'Актобе', 'Тараз', 'Павлодар', 'Другой город'];
const SOURCES  = ['Instagram', 'WhatsApp', 'Telegram', 'Звонок', 'Рекомендация', 'Сайт', 'Другое'];
const DELIVERY_OPTIONS = ['Самовывоз', 'Курьер по городу', 'Казпочта', 'Жд', 'Авиа', 'СДЭК', 'Другое'];

// ── SelectOrText ──────────────────────────────────────────────────────────────

function SelectOrText({ options, placeholder, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { options: string[] }) {
  const id = useId();
  return (
    <>
      <datalist id={id}>{options.map((o) => <option key={o} value={o} />)}</datalist>
      <input {...props} list={id} placeholder={placeholder} className={className} autoComplete="off" />
    </>
  );
}

function parseOptionalAmount(value: string) {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const DELIVERY_FEE_MAP: Record<string, number> = {
  'Казпочта': 2000,
  'Жд': 3000,
  'Авиа': 5000,
};

const DELIVERY = ['Самовывоз', 'Курьер по городу', 'Казпочта', 'СДЭК', 'Другое'];

// ── Schema ────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  fabric: z.string().optional(),
  productName: z.string().min(1, 'Укажите модель'),
  size:        z.string().min(1, 'Укажите размер'),
  quantity:    z.coerce.number().int().min(1),
  unitPrice:   z.coerce.number().min(0).default(0),
  color:        z.string().optional(),
  gender:       z.string().optional(),
  length:       z.string().optional(),
  workshopNotes: z.string().optional(),
});

const schema = z.object({
  clientName:  z.string().min(2, 'Минимум 2 символа'),
  clientPhone: z.string()
    .min(1, 'Телефон обязателен')
    .refine((value) => isKazakhPhoneComplete(value), 'Введите номер в формате +7 (777)-777-77-77'),
  dueDate:     z.string().optional(),
  city:         z.string().optional(),
  streetAddress: z.string().optional(),
  postalCode:   z.string().optional(),
  deliveryType: z.string().optional(),
  source:       z.string().optional(),
  orderDate:    z.string().optional(),
  urgency:     z.enum(['normal', 'urgent']).default('normal'),
  isDemandingClient: z.boolean().default(false),
  orderDiscount: z.coerce.number().min(0).optional(),
  deliveryFee:   z.coerce.number().min(0).optional(),
  bankCommissionPercent: z.coerce.number().min(0).max(100).optional(),
  items:       z.array(itemSchema).min(1, 'Добавьте хотя бы одну позицию'),
});

type FormData = z.infer<typeof schema>;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChapanEditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, isError } = useOrder(id!);
  const updateOrder = useUpdateOrder();
  const requestItemChange = useRequestItemChange();
  const { data: catalogs } = useChapanCatalogs();

  const products = catalogs?.productCatalog ?? [];
  const sizes    = catalogs?.sizeCatalog    ?? [];

  // Change request modal state (for in_production orders)
  const [changeRequestModal, setChangeRequestModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [managerNote, setManagerNote] = useState('');

  const {
    register, control, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { urgency: 'normal', isDemandingClient: false, items: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const urgency           = watch('urgency');
  const isDemandingClient = watch('isDemandingClient');
  const items             = watch('items');
  const deliveryType      = watch('deliveryType');
  const orderDiscountRaw  = watch('orderDiscount');
  const deliveryFeeRaw    = watch('deliveryFee');
  const bankCommPctRaw    = watch('bankCommissionPercent');
  const [discountPercent, setDiscountPercent] = useState('');

  // F3: auto-fill delivery fee when delivery type changes
  useEffect(() => {
    const autoFee = DELIVERY_FEE_MAP[deliveryType ?? ''];
    if (autoFee !== undefined) setValue('deliveryFee', autoFee);
  }, [deliveryType]); // eslint-disable-line react-hooks/exhaustive-deps

  const itemsTotal            = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const orderDiscount         = Number.isFinite(orderDiscountRaw)  ? (orderDiscountRaw  ?? 0) : 0;
  const deliveryFee           = Number.isFinite(deliveryFeeRaw)    ? (deliveryFeeRaw    ?? 0) : 0;
  const bankCommPct           = Number.isFinite(bankCommPctRaw)    ? (bankCommPctRaw    ?? 0) : 0;
  const subtotalAfterDiscount = Math.max(0, itemsTotal - orderDiscount);
  const bankCommAmount        = Math.round(subtotalAfterDiscount * bankCommPct / 100);
  const finalTotal            = Math.max(0, subtotalAfterDiscount + deliveryFee + bankCommAmount);
  // to avoid wiping user's in-progress edits (React Query refetchOnMount reuses the same
  // component instance but may deliver a new object reference for the same data).
  const formPopulated = useRef(false);
  useEffect(() => {
    if (!order || formPopulated.current) return;
    formPopulated.current = true;
    reset({
      clientName:  formatPersonNameInput(order.clientName),
      clientPhone: formatKazakhPhoneInput(order.clientPhone),
      dueDate:     order.dueDate ? order.dueDate.slice(0, 10) : '',
      urgency:     (order.urgency ?? (order.priority === 'urgent' ? 'urgent' : 'normal')) as Urgency,
      isDemandingClient: order.isDemandingClient ?? (order.priority === 'vip'),
      city:          order.city ?? '',
      streetAddress: order.streetAddress ?? '',
      postalCode:    order.postalCode ?? '',
      deliveryType:  order.deliveryType ?? '',
      source:        order.source ?? '',
      orderDate:     order.orderDate ? order.orderDate.slice(0, 10) : '',
      orderDiscount: order.orderDiscount > 0 ? order.orderDiscount : undefined,
      deliveryFee:   order.deliveryFee   > 0 ? order.deliveryFee   : undefined,
      bankCommissionPercent: order.bankCommissionPercent > 0 ? order.bankCommissionPercent : undefined,
      items: (order.items ?? []).map(item => ({
        fabric:        item.fabric ?? '',
        productName:   item.productName,
        size:          item.size,
        quantity:      item.quantity,
        unitPrice:     item.unitPrice,
        color:         item.color ?? '',
        gender:        item.gender ?? '',
        length:        item.length ?? '',
        workshopNotes: item.workshopNotes ?? '',
      })),
    });
  }, [order, reset]);

  const canEditItems = ['new', 'confirmed'].includes(order?.status ?? '');
  const isInProduction = order?.status === 'in_production';

  function fmt(n: number) {
    return `${new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(n)} ₸`;
  }


  async function onSubmit(data: FormData) {
    if (!id) return;

    // For in_production orders with item changes — show confirmation modal first
    if (isInProduction) {
      setPendingFormData(data);
      setChangeRequestModal(true);
      return;
    }

    await updateOrder.mutateAsync({
      id,
      dto: {
        clientName:  formatPersonNameInput(data.clientName).trim(),
        clientPhone: formatKazakhPhoneInput(data.clientPhone),
        dueDate:     data.dueDate || null,
        priority:    data.urgency === 'urgent' ? 'urgent' : data.isDemandingClient ? 'vip' : 'normal',
        urgency:     data.urgency as Urgency,
        isDemandingClient: data.isDemandingClient,
        city:          data.city?.trim() || undefined,
        streetAddress: data.streetAddress?.trim() || undefined,
        postalCode:    data.postalCode?.trim() || undefined,
        deliveryType:  data.deliveryType?.trim() || undefined,
        source:        data.source?.trim() || undefined,
        orderDate:     data.orderDate || undefined,
        orderDiscount: orderDiscount > 0 ? orderDiscount : 0,
        deliveryFee:   deliveryFee   > 0 ? deliveryFee   : 0,
        bankCommissionPercent: bankCommPct > 0 ? bankCommPct : 0,
        bankCommissionAmount:  bankCommAmount > 0 ? bankCommAmount : 0,
        items:       canEditItems ? data.items.map(item => ({
          fabric:        item.fabric?.trim() || undefined,
          productName:   item.productName,
          size:          item.size,
          quantity:      item.quantity,
          unitPrice:     item.unitPrice,
          color:         item.color?.trim() || undefined,
          gender:        item.gender?.trim() || undefined,
          length:        item.length?.trim() || undefined,
          workshopNotes: item.workshopNotes || undefined,
        })) : undefined,
      },
    });
    navigate(`/workzone/chapan/orders/${id}`);
  }

  async function handleSubmitChangeRequest() {
    if (!id || !pendingFormData) return;

    function itemKey(productName: string, size: string, fabric?: string) {
      return `${productName}|${size}|${(fabric ?? '').toLowerCase().trim()}`;
    }
    const existingKeys = new Set((order!.items ?? []).map(i => itemKey(i.productName, i.size, i.fabric ?? '')));
    const newItems = pendingFormData.items.filter(i => !existingKeys.has(itemKey(i.productName, i.size, i.fabric)));
    const changedItems = pendingFormData.items.filter(i => {
      if (!existingKeys.has(itemKey(i.productName, i.size, i.fabric))) return false;
      const orig = order!.items.find(o => itemKey(o.productName, o.size, o.fabric ?? '') === itemKey(i.productName, i.size, i.fabric));
      return orig && (orig.quantity !== i.quantity || orig.unitPrice !== i.unitPrice);
    });
    const hasItemChanges = newItems.length > 0 || changedItems.length > 0;

    // Always save non-item fields directly (no approval needed)
    await updateOrder.mutateAsync({
      id,
      dto: {
        clientName:  formatPersonNameInput(pendingFormData.clientName).trim(),
        clientPhone: formatKazakhPhoneInput(pendingFormData.clientPhone),
        dueDate:     pendingFormData.dueDate || null,
        priority:    pendingFormData.urgency === 'urgent' ? 'urgent' : pendingFormData.isDemandingClient ? 'vip' : 'normal',
        urgency:     pendingFormData.urgency as Urgency,
        isDemandingClient: pendingFormData.isDemandingClient,
        city:          pendingFormData.city?.trim() || undefined,
        streetAddress: pendingFormData.streetAddress?.trim() || undefined,
        postalCode:    pendingFormData.postalCode?.trim() || undefined,
        deliveryType:  pendingFormData.deliveryType?.trim() || undefined,
        source:        pendingFormData.source?.trim() || undefined,
        orderDate:     pendingFormData.orderDate || undefined,
        orderDiscount: orderDiscount > 0 ? orderDiscount : 0,
        deliveryFee:   deliveryFee   > 0 ? deliveryFee   : 0,
        bankCommissionPercent: bankCommPct > 0 ? bankCommPct : 0,
        bankCommissionAmount:  bankCommAmount > 0 ? bankCommAmount : 0,
      },
    });

    // Only send change request to workshop if items actually changed
    if (hasItemChanges) {
      await requestItemChange.mutateAsync({
        id,
        items: pendingFormData.items.map(item => ({
          fabric:        item.fabric?.trim() || undefined,
          productName:   item.productName,
          size:          item.size,
          quantity:      item.quantity,
          unitPrice:     item.unitPrice,
          color:         item.color?.trim() || undefined,
          gender:        item.gender?.trim() || undefined,
          length:        item.length?.trim() || undefined,
          workshopNotes: item.workshopNotes || undefined,
        })),
        managerNote: managerNote.trim() || undefined,
      });
    }

    setChangeRequestModal(false);
    navigate(`/workzone/chapan/orders/${id}`);
  }

  if (isLoading) {
    return (
      <div className={styles.root}>
        <div style={{ padding: 40, color: 'var(--ch-text-muted)' }}>Загрузка...</div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className={styles.root}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '60px 20px', color: 'var(--ch-text-muted)' }}>
          <AlertTriangle size={24} />
          <p>Заказ не найден</p>
          <button onClick={() => navigate('/workzone/chapan/orders')} style={{ padding: '8px 18px', background: 'var(--ch-surface)', border: '1px solid var(--ch-border)', borderRadius: 7, color: 'var(--ch-plat-bright)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
            ← Назад к заказам
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <button className={styles.backLink} onClick={() => navigate(`/workzone/chapan/orders/${id}`)}>
          <ChevronLeft size={14} />
          <span>#{order.orderNumber}</span>
        </button>
        <h1 className={styles.pageTitle}>Редактировать заказ</h1>
      </div>

      {isInProduction && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
          background: 'rgba(217,79,79,.08)', border: '1px solid rgba(217,79,79,.25)',
          borderRadius: 10, marginBottom: 4, color: '#D94F4F',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, lineHeight: 1.5 }}>
            <strong>Заказ уже в производстве.</strong> Изменения позиций потребуют согласования цеха —
            швея получит уведомление и сможет одобрить или отклонить запрос.
            Данные клиента и приоритет сохраняются без согласования.
          </span>
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>

        {/* ── 01 Данные клиента ──────────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>01</span>
            <span className={styles.sectionTitle}>Данные клиента</span>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>ФИО клиента <span className={styles.req}>*</span></label>
                <Controller
                  control={control}
                  name="clientName"
                  render={({ field }) => (
                    <input
                      {...field}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(formatPersonNameInput(event.target.value))}
                      className={`${styles.input} ${errors.clientName ? styles.inputError : ''}`}
                      placeholder="Аскаров Аскар Аскарович"
                    />
                  )}
                />
                {errors.clientName && <span className={styles.fieldError}>{errors.clientName.message}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Телефон <span className={styles.req}>*</span></label>
                <Controller
                  control={control}
                  name="clientPhone"
                  render={({ field }) => (
                    <input
                      {...field}
                      type="tel"
                      inputMode="tel"
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(formatKazakhPhoneInput(event.target.value))}
                      className={`${styles.input} ${errors.clientPhone ? styles.inputError : ''}`}
                      placeholder="+7 (701)-234-56-78"
                    />
                  )}
                />
                {errors.clientPhone && <span className={styles.fieldError}>{errors.clientPhone.message}</span>}
              </div>
            </div>

            {/* Адрес и доставка */}
            <div className={styles.row3}>
              <div className={styles.field}>
                <label className={styles.label}>Город</label>
                <Controller control={control} name="city" render={({ field }) => (
                  <SelectOrText {...field} value={field.value ?? ''} options={CITIES} placeholder="Алматы" className={styles.input} />
                )} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Почтовый индекс</label>
                <input {...register('postalCode')} className={styles.input} placeholder="050000" maxLength={10} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Доставка</label>
                <Controller control={control} name="deliveryType" render={({ field }) => (
                  <SelectOrText {...field} value={field.value ?? ''} options={DELIVERY_OPTIONS} placeholder="Выберите или введите" className={styles.input} />
                )} />
              </div>
            </div>
            <div className={styles.rowFull}>
              <div className={styles.field}>
                <label className={styles.label}>Адрес доставки</label>
                <input {...register('streetAddress')} className={styles.input} placeholder="ул. Абая 10, кв. 5 / ориентир" />
              </div>
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Источник</label>
                <Controller control={control} name="source" render={({ field }) => (
                  <SelectOrText {...field} value={field.value ?? ''} options={SOURCES} placeholder="Instagram, звонок..." className={styles.input} />
                )} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Дата заказа</label>
                <input {...register('orderDate')} type="date" className={styles.input} />
              </div>
            </div>
          </div>
        </section>

        {/* ── 02 Позиции заказа ──────────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>02</span>
            <span className={styles.sectionTitle}>
              Позиции заказа
              {isInProduction && (
                <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 400, color: '#D94F4F', textTransform: 'none', letterSpacing: 0 }}>
                  (потребует согласования цеха)
                </span>
              )}
              {!canEditItems && !isInProduction && (
                <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 400, color: 'var(--ch-text-muted)', textTransform: 'none', letterSpacing: 0 }}>
                  (недоступно после начала производства)
                </span>
              )}
            </span>
          </div>
          <div className={styles.sectionBody}>
            {fields.map((field, idx) => {
              const lineTotal = (Number(items[idx]?.quantity) || 0) * (Number(items[idx]?.unitPrice) || 0);
              const editable = canEditItems || isInProduction;

              return (
                <div key={field.id} className={styles.itemCard}>
                  <div className={styles.itemCardHeader}>
                    <span className={styles.itemCardLabel}>Позиция {idx + 1}</span>
                    {editable && fields.length > 1 && (
                      <button type="button" className={styles.itemRemoveBtn} onClick={() => remove(idx)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* Модель + Размер */}
                  <div className={styles.itemRow2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Модель <span className={styles.req}>*</span></label>
                      <Controller control={control} name={`items.${idx}.productName`} render={({ field: f }) => (
                        products.length > 0 ? (
                          <select {...f} disabled={!editable} className={`${styles.select} ${errors.items?.[idx]?.productName ? styles.inputError : ''}`}>
                            <option value="">Выберите модель</option>
                            {products.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        ) : (
                          <input {...f} disabled={!editable} className={`${styles.input} ${errors.items?.[idx]?.productName ? styles.inputError : ''}`} placeholder="Назар — жуп шапан" />
                        )
                      )} />
                      {errors.items?.[idx]?.productName && <span className={styles.fieldError}>{errors.items[idx]?.productName?.message}</span>}
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Размер <span className={styles.req}>*</span></label>
                      <Controller control={control} name={`items.${idx}.size`} render={({ field: f }) => (
                        sizes.length > 0 ? (
                          <select {...f} disabled={!editable} className={`${styles.select} ${errors.items?.[idx]?.size ? styles.inputError : ''}`}>
                            <option value="">— выбрать —</option>
                            {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <input {...f} disabled={!editable} className={`${styles.input} ${errors.items?.[idx]?.size ? styles.inputError : ''}`} placeholder="48" />
                        )
                      )} />
                      {errors.items?.[idx]?.size && <span className={styles.fieldError}>{errors.items[idx]?.size?.message}</span>}
                    </div>
                  </div>

                  {/* Кол-во + Цена */}
                  <div className={styles.itemRow2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Кол-во</label>
                      <input
                        {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                        type="number" min="1"
                        disabled={!editable}
                        className={styles.input}
                        onWheel={e => e.currentTarget.blur()}
                        onFocus={e => e.target.select()}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Цена за ед. (₸)</label>
                      <input
                        {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                        type="number" min="0"
                        disabled={!editable}
                        className={styles.input}
                        placeholder="0"
                        onWheel={e => e.currentTarget.blur()}
                        onFocus={e => e.target.select()}
                      />
                    </div>
                  </div>

                  {lineTotal > 0 && (
                    <div className={styles.lineTotalRow}>
                      <span className={styles.lineTotalFinal}>{fmt(lineTotal)}</span>
                    </div>
                  )}

                  {/* Цвет + Пол + Длина */}
                  <div className={styles.itemRow2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Цвет</label>
                      <input
                        {...register(`items.${idx}.color`)}
                        disabled={!editable}
                        className={styles.input}
                        placeholder="Тёмно-синий, бордо..."
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Пол</label>
                      <Controller control={control} name={`items.${idx}.gender`} render={({ field: f }) => (
                        <select {...f} disabled={!editable} className={styles.select}>
                          <option value="">— не указан —</option>
                          <option value="муж">Мужской</option>
                          <option value="жен">Женский</option>
                          <option value="унисекс">Унисекс</option>
                        </select>
                      )} />
                    </div>
                  </div>
                  <div className={styles.itemRow2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Длина</label>
                      <input
                        {...register(`items.${idx}.length`)}
                        disabled={!editable}
                        className={styles.input}
                        placeholder="Макси, 120 см..."
                      />
                    </div>
                    <div className={styles.field} />
                  </div>

                  <div className={styles.itemNoteField}>
                    <input
                      {...register(`items.${idx}.fabric`)}
                      type="hidden"
                    />
                    <input
                      {...register(`items.${idx}.workshopNotes`)}
                      disabled={!editable}
                      className={styles.itemNoteInput}
                      placeholder="Комментарий для цеха (необязательно)..."
                    />
                  </div>
                </div>
              );
            })}

            {(canEditItems || isInProduction) && (
              <div className={styles.itemsFooter}>
                <button
                  type="button"
                  className={styles.addItemBtn}
                  onClick={() => append({ productName: '', size: '', quantity: 1, unitPrice: 0, color: '', gender: '', length: '', workshopNotes: '' })}
                >
                  <Plus size={13} />
                  Добавить позицию
                </button>
                {itemsTotal > 0 && (
                  <div className={styles.itemsTotal}>
                    <span>Итого по позициям:</span>
                    <strong>{fmt(itemsTotal)}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── 03 Сроки и приоритет ──────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>03</span>
            <span className={styles.sectionTitle}>Сроки и приоритет</span>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Срок готовности</label>
                <input {...register('dueDate')} type="date" className={styles.input} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Приоритет</label>
                <div className={styles.priorityGroup}>
                  <button
                    type="button"
                    className={`${styles.priorityBtn} ${urgency === 'normal' ? styles.priorityBtnActive : ''}`}
                    onClick={() => setValue('urgency', 'normal')}
                  >
                    Обычный
                  </button>
                  <button
                    type="button"
                    className={`${styles.priorityBtn} ${styles.priorityBtnUrgent} ${urgency === 'urgent' ? styles.priorityBtnActive : ''}`}
                    onClick={() => setValue('urgency', 'urgent')}
                  >
                    🔴 Срочно
                  </button>
                </div>
                <label className={styles.demandingToggle}>
                  <input
                    type="checkbox"
                    checked={isDemandingClient}
                    onChange={e => setValue('isDemandingClient', e.target.checked)}
                    className={styles.demandingCheckbox}
                  />
                  <span>⭐ Требовательный клиент</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* ── 04 Финансы ────────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionNum}>04</span>
            <span className={styles.sectionTitle}>Финансы</span>
          </div>
          <div className={styles.sectionBody}>

            {/* Доставка */}
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Способ доставки</label>
                <Controller control={control} name="deliveryType" render={({ field }) => (
                  <SelectOrText {...field} value={field.value ?? ''} options={DELIVERY_OPTIONS} placeholder="Выберите или введите" className={styles.input} />
                )} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Сумма доставки (₸)</label>
                <Controller control={control} name="deliveryFee" render={({ field }) => (
                  <input
                    type="number" min="0" inputMode="numeric"
                    className={styles.input}
                    placeholder="0 ₸"
                    value={field.value ?? ''}
                    onChange={e => field.onChange(parseOptionalAmount(e.target.value))}
                    onWheel={e => e.currentTarget.blur()}
                    onFocus={e => e.target.select()}
                  />
                )} />
              </div>
            </div>

            {/* Финансовый пайплайн */}
            <div className={styles.finPipeline}>

              {/* Сумма по позициям */}
              <div className={styles.finRow}>
                <div>
                  <span className={styles.finLabel}>Сумма по позициям</span>
                  {items.length > 0 && (
                    <div className={styles.finLabelSub}>
                      {items.length} {items.length === 1 ? 'позиция' : items.length < 5 ? 'позиции' : 'позиций'}
                      {' · '}
                      {items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} шт.
                    </div>
                  )}
                </div>
                <span className={styles.finValue}>{itemsTotal > 0 ? fmt(itemsTotal) : '—'}</span>
              </div>

              {/* Скидка */}
              <div className={styles.finRow}>
                <span className={styles.finLabel}>Скидка</span>
                <div className={styles.discountCompound}>
                  <Controller control={control} name="orderDiscount" render={({ field }) => (
                    <input
                      type="number" min="0" inputMode="numeric"
                      className={`${styles.finInput} ${styles.discountAmtInput}`}
                      placeholder="0 ₸"
                      value={field.value ?? ''}
                      onChange={e => {
                        const amt = parseOptionalAmount(e.target.value);
                        field.onChange(amt);
                        if (itemsTotal > 0 && Number.isFinite(amt) && (amt ?? 0) > 0) {
                          setDiscountPercent(((amt! / itemsTotal) * 100).toFixed(1));
                        } else { setDiscountPercent(''); }
                      }}
                      onWheel={e => e.currentTarget.blur()}
                      onFocus={e => e.target.select()}
                    />
                  )} />
                  <div className={styles.discountPctWrap}>
                    <input
                      type="number" min="0" max="100" step="0.1"
                      className={styles.discountPctInput}
                      placeholder="0"
                      value={discountPercent}
                      onChange={e => {
                        setDiscountPercent(e.target.value);
                        const pct = parseFloat(e.target.value);
                        if (Number.isFinite(pct) && itemsTotal > 0) {
                          setValue('orderDiscount', Math.round(itemsTotal * pct / 100));
                        } else if (!e.target.value) { setValue('orderDiscount', 0); }
                      }}
                      onWheel={e => e.currentTarget.blur()}
                      onFocus={e => e.target.select()}
                    />
                    <span className={styles.discountPctSymbol}>%</span>
                  </div>
                </div>
              </div>

              {/* Банковская комиссия */}
              <div className={styles.finRow}>
                <span className={styles.finLabel}>Комиссия банка</span>
                <div className={styles.discountCompound}>
                  <div className={styles.finValue} style={{ minWidth: 80 }}>
                    {bankCommAmount > 0 ? fmt(bankCommAmount) : '—'}
                  </div>
                  <div className={styles.discountPctWrap}>
                    <Controller control={control} name="bankCommissionPercent" render={({ field }) => (
                      <input
                        type="number" min="0" max="100" step="0.1"
                        className={styles.discountPctInput}
                        placeholder="0"
                        value={field.value ?? ''}
                        onChange={e => field.onChange(parseOptionalAmount(e.target.value))}
                        onWheel={e => e.currentTarget.blur()}
                        onFocus={e => e.target.select()}
                      />
                    )} />
                    <span className={styles.discountPctSymbol}>%</span>
                  </div>
                </div>
              </div>

              {/* Итого к оплате */}
              <div className={`${styles.finRow} ${styles.finRowTotal}`}>
                <span className={styles.finLabel}>Итого к оплате</span>
                <span className={styles.finValueBold}>{itemsTotal > 0 ? fmt(finalTotal) : '—'}</span>
              </div>

            </div>
          </div>
        </section>

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => navigate(`/workzone/chapan/orders/${id}`)}
          >
            Отмена
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting || updateOrder.isPending || requestItemChange.isPending}
          >
            {updateOrder.isPending || requestItemChange.isPending
              ? 'Сохранение...'
              : isInProduction
                ? 'Сохранить / Запросить изменения'
                : 'Сохранить изменения'}
          </button>
        </div>

      </form>

      {/* ── Change Request Confirmation Modal ──────────────────────────────── */}
      {changeRequestModal && pendingFormData && (() => {
        // Compute diff: which items are new vs existing
        function itemKey(productName: string, size: string, fabric?: string) {
          return `${productName}|${size}|${(fabric ?? '').toLowerCase().trim()}`;
        }
        const existingKeys = new Set((order.items ?? []).map(i => itemKey(i.productName, i.size, i.fabric ?? '')));
        const newItems = pendingFormData.items.filter(i => !existingKeys.has(itemKey(i.productName, i.size, i.fabric)));
        const changedItems = pendingFormData.items.filter(i => {
          if (!existingKeys.has(itemKey(i.productName, i.size, i.fabric))) return false;
          const orig = order.items.find(o => itemKey(o.productName, o.size, o.fabric ?? '') === itemKey(i.productName, i.size, i.fabric));
          return orig && (orig.quantity !== i.quantity || orig.unitPrice !== i.unitPrice);
        });

        return (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
            onClick={() => setChangeRequestModal(false)}
          >
            <div
              style={{
                background: 'var(--ch-surface)', border: '1px solid var(--ch-border)',
                borderRadius: 14, width: '100%', maxWidth: 460, padding: 24,
                display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh', overflowY: 'auto',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D94F4F', fontWeight: 600, fontSize: 15 }}>
                  <AlertTriangle size={18} />
                  Запрос на изменение позиций
                </div>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ch-text-muted)', padding: 4 }}
                  onClick={() => setChangeRequestModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: 13, color: 'var(--ch-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Заказ уже в производстве. Данные клиента и приоритет сохранятся сразу.
                Изменения <strong>позиций</strong> уйдут на согласование в цех — швея продолжит работу,
                новые задания появятся автоматически после одобрения.
              </p>

              {/* Diff summary */}
              {(newItems.length > 0 || changedItems.length > 0) && (
                <div style={{
                  background: 'var(--ch-surface-inset)', borderRadius: 9,
                  border: '1px solid var(--ch-border)', padding: '12px 14px',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ch-text-muted)', marginBottom: 2 }}>
                    Что изменится
                  </div>
                  {newItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--ch-text)' }}>
                      <span style={{ color: '#10b981', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>+</span>
                      <span>{item.productName} / {item.size} × {item.quantity}</span>
                      <span style={{ color: 'var(--ch-text-muted)', marginLeft: 'auto' }}>новая</span>
                    </div>
                  ))}
                  {changedItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--ch-text)' }}>
                      <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>~</span>
                      <span>{item.productName} / {item.size} × {item.quantity}</span>
                      <span style={{ color: 'var(--ch-text-muted)', marginLeft: 'auto' }}>цена/кол-во</span>
                    </div>
                  ))}
                </div>
              )}

              {newItems.length === 0 && changedItems.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--ch-text-muted)', background: 'var(--ch-surface-inset)', borderRadius: 8, padding: '10px 12px' }}>
                  Позиции не изменились — будут сохранены только данные клиента и приоритет без запроса в цех.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ch-text-muted)' }}>
                  Пояснение для цеха (необязательно)
                </label>
                <input
                  value={managerNote}
                  onChange={e => setManagerNote(e.target.value)}
                  placeholder="Например: клиент добавил жилет..."
                  autoFocus
                  style={{
                    background: 'var(--ch-surface-inset)', border: '1px solid var(--ch-border)',
                    borderRadius: 8, color: 'var(--ch-text)', fontFamily: 'inherit',
                    fontSize: 13, padding: '9px 12px', outline: 'none',
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitChangeRequest()}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  style={{
                    flex: 1, padding: '9px 0', background: 'var(--ch-surface-inset)',
                    border: '1px solid var(--ch-border)', borderRadius: 8,
                    color: 'var(--ch-text-secondary)', fontFamily: 'inherit',
                    fontSize: 13, cursor: 'pointer',
                  }}
                  onClick={() => setChangeRequestModal(false)}
                >
                  Отмена
                </button>
                <button
                  style={{
                    flex: 2, padding: '9px 0',
                    background: newItems.length > 0 || changedItems.length > 0 ? '#D94F4F' : 'var(--ch-accent)',
                    border: 'none', borderRadius: 8, color: '#fff',
                    fontWeight: 600, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
                    opacity: requestItemChange.isPending || updateOrder.isPending ? .6 : 1,
                  }}
                  onClick={handleSubmitChangeRequest}
                  disabled={requestItemChange.isPending || updateOrder.isPending}
                >
                  {requestItemChange.isPending || updateOrder.isPending
                    ? 'Отправка...'
                    : newItems.length > 0 || changedItems.length > 0
                      ? 'Отправить запрос в цех'
                      : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
