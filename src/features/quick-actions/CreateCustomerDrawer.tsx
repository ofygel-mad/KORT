import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Drawer } from '../../shared/ui/Drawer';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { api } from '../../shared/api/client';
import { useUIStore } from '../../shared/stores/ui';
import { setProductMoment } from '../../shared/utils/productMoment';
import styles from './CreateCustomerDrawer.module.css';

type CustomerForm = {
  full_name: string;
  company_name: string;
  phone: string;
  email: string;
  source: string;
};

type CreatedCustomer = CustomerForm & { id: string };

const DEFAULT_VALUES: CustomerForm = {
  full_name: '',
  company_name: '',
  phone: '',
  email: '',
  source: 'Ручное добавление',
};

const phoneDigits = (value: string) => value.replace(/\D/g, '');

export function CreateCustomerDrawer() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const request = useUIStore((s) => s.createCustomerRequest);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, setFocus, formState: { errors, isSubmitting } } = useForm<CustomerForm>({
    defaultValues: DEFAULT_VALUES,
  });

  const createCustomer = useMutation({
    mutationFn: (payload: CustomerForm) => api.post('/customers/', payload),
    onSuccess: (created: CreatedCustomer) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setProductMoment(`Клиент «${created.full_name}» создан. Проверьте карточку, закрепите источник и зафиксируйте следующий шаг.`);
      toast.success('Клиент создан');
      setOpen(false);
      reset(DEFAULT_VALUES);
      if (created?.id) navigate(`/customers/${created.id}`);
    },
    onError: () => toast.error('Не удалось создать клиента'),
  });

  useEffect(() => {
    if (!request.nonce) return;
    setOpen(true);
    reset(DEFAULT_VALUES);
    setTimeout(() => setFocus('full_name'), 40);
  }, [request.nonce, reset, setFocus]);

  return (
    <Drawer
      open={open}
      onClose={() => { setOpen(false); reset(DEFAULT_VALUES); }}
      title="Новый клиент"
      subtitle="Сохраните контакт сразу, а детали спокойно уточните в карточке. Никакой религиозной церемонии из пяти экранов."
      footer={
        <div className={styles.footer}>
          <Button variant="secondary" onClick={() => { setOpen(false); reset(DEFAULT_VALUES); }}>Отмена</Button>
          <Button loading={isSubmitting || createCustomer.isPending} onClick={handleSubmit((data) => createCustomer.mutate({ ...data, full_name: data.full_name.trim(), company_name: data.company_name.trim(), email: data.email.trim().toLowerCase(), source: data.source.trim() }))}>Создать клиента</Button>
        </div>
      }
    >
      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <Input label="Имя и фамилия" required placeholder="Например, Асем Нурланова" error={errors.full_name?.message} {...register('full_name', { required: 'Укажите имя клиента', minLength: { value: 2, message: 'Имя слишком короткое' }, validate: (v) => v.trim().length >= 2 || 'Имя слишком короткое' })} />
        <div className={styles.row}>
          <Input label="Компания" placeholder="ТОО Альфа" error={errors.company_name?.message} {...register('company_name', { validate: (v) => !v || v.trim().length >= 2 || 'Название компании слишком короткое' })} />
          <Input label="Источник" placeholder="Instagram, рекомендация, сайт" error={errors.source?.message} {...register('source', { validate: (v) => v.trim().length >= 2 || 'Укажите источник' })} />
        </div>
        <div className={styles.row}>
          <Input label="Телефон" required placeholder="+7 701 123 45 67" error={errors.phone?.message} {...register('phone', { required: 'Укажите телефон', validate: (v) => phoneDigits(v).length >= 10 || 'Введите корректный телефон' })} />
          <Input label="Email" type="email" placeholder="client@company.kz" error={errors.email?.message} {...register('email', { validate: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Введите корректный email' })} />
        </div>
        <p className={styles.hint}>После создания откроется карточка клиента. Так заметно полезнее, чем держать человека в полумёртвом drawer без продолжения.</p>
      </form>
    </Drawer>
  );
}
