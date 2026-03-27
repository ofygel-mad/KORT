import { useEffect, useState } from 'react';
import { X, FileText, Check, Clock, Download } from 'lucide-react';
import { useInvoices, useConfirmSeamstress, useConfirmWarehouse } from '../../../../entities/order/queries';
import type { ChapanInvoice, InvoiceStatus } from '../../../../entities/order/types';
import ChapanInvoicePreviewModal from './ChapanInvoicePreviewModal';
import styles from './ChapanInvoicesDrawer.module.css';

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  pending_confirmation: 'Ожидает',
  confirmed: 'Подтверждена',
  rejected: 'Отклонена',
};

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  pending_confirmation: '#F59E0B',
  confirmed: '#10B981',
  rejected: '#EF4444',
};

function fmtDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ru-KZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function downloadInvoice(invoiceId: string, invoiceNumber: string) {
  const { apiClient } = await import('../../../../shared/api/client');
  try {
    const response = await apiClient.get(`/chapan/invoices/${invoiceId}/download`, {
      params: { style: 'branded' },
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nakladnaya-${invoiceNumber}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    // silent
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChapanInvoicesDrawer({ open, onClose }: Props) {
  const { data, isLoading } = useInvoices({ limit: 100 });
  const invoices: ChapanInvoice[] = data?.results ?? [];

  const confirmSeamstress = useConfirmSeamstress();
  const confirmWarehouse = useConfirmWarehouse();
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !previewInvoiceId) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, previewInvoiceId]);

  useEffect(() => {
    if (!open) {
      setPreviewInvoiceId(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <aside className={styles.panel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <FileText size={16} />
              <span>Накладные</span>
              {data && data.count > 0 && (
                <span className={styles.badge}>{data.count}</span>
              )}
            </div>
            <button className={styles.closeBtn} onClick={onClose} type="button">
              <X size={16} />
            </button>
          </div>

          <div className={styles.body}>
            {isLoading && (
              <div className={styles.loading}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={styles.skeleton} />
                ))}
              </div>
            )}

            {!isLoading && invoices.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📋</div>
                <div>Накладных пока нет</div>
                <div className={styles.emptyHint}>
                  Создаются при отправке готовых заказов на склад
                </div>
              </div>
            )}

            {!isLoading && invoices.map((inv) => (
              <div key={inv.id} className={styles.row}>
                <div className={styles.rowTop}>
                  <span className={styles.number}>#{inv.invoiceNumber}</span>
                  <span
                    className={styles.statusBadge}
                    style={{ '--badge-color': STATUS_COLOR[inv.status] } as React.CSSProperties}
                  >
                    {STATUS_LABEL[inv.status]}
                  </span>
                  <button
                    type="button"
                    className={styles.downloadBtn}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void downloadInvoice(inv.id, inv.invoiceNumber);
                    }}
                    title="Скачать XLSX"
                  >
                    <Download size={12} />
                  </button>
                </div>

                <div className={styles.rowMeta}>
                  <span>{fmtDate(inv.createdAt)}</span>
                  <span>·</span>
                  <span>{inv.items?.length ?? 0} заказ(ов)</span>
                  <span>·</span>
                  <span>{inv.createdByName}</span>
                </div>

                <div className={styles.rowConfirm}>
                  <span className={`${styles.confirmChip} ${inv.seamstressConfirmed ? styles.done : ''}`}>
                    {inv.seamstressConfirmed ? <Check size={11} /> : <Clock size={11} />}
                    Швея
                  </span>
                  <span className={`${styles.confirmChip} ${inv.warehouseConfirmed ? styles.done : ''}`}>
                    {inv.warehouseConfirmed ? <Check size={11} /> : <Clock size={11} />}
                    Склад
                  </span>

                  {inv.status === 'pending_confirmation' && !inv.seamstressConfirmed && (
                    <button
                      type="button"
                      className={styles.confirmBtn}
                      onClick={() => confirmSeamstress.mutate(inv.id)}
                      disabled={confirmSeamstress.isPending}
                    >
                      Отправлено
                    </button>
                  )}
                  {inv.status === 'pending_confirmation' && !inv.warehouseConfirmed && (
                    <button
                      type="button"
                      className={styles.confirmBtn}
                      onClick={() => confirmWarehouse.mutate(inv.id)}
                      disabled={confirmWarehouse.isPending}
                    >
                      Принято
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.confirmBtn}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setPreviewInvoiceId(inv.id);
                    }}
                  >
                    Просмотр
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <ChapanInvoicePreviewModal
        open={Boolean(previewInvoiceId)}
        invoiceId={previewInvoiceId}
        onClose={() => setPreviewInvoiceId(null)}
      />
    </>
  );
}
