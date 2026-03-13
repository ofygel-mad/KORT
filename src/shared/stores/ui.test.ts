import { describe, expect, it } from 'vitest';
import { useUIStore } from './ui';

describe('useUIStore action requests', () => {

  it('increments customer request nonce', () => {
    const before = useUIStore.getState().createCustomerRequest.nonce;
    useUIStore.getState().openCreateCustomer();
    const after = useUIStore.getState().createCustomerRequest;

    expect(after.nonce).toBe(before + 1);
  });

  it('increments deal request nonce and stores payload', () => {
    const before = useUIStore.getState().createDealRequest.nonce;
    useUIStore.getState().openCreateDeal({ customerId: 'c-9', title: 'Новая поставка' });
    const after = useUIStore.getState().createDealRequest;

    expect(after.nonce).toBe(before + 1);
    expect(after.payload).toEqual({ customerId: 'c-9', title: 'Новая поставка' });
  });
  it('increments task request nonce and stores payload', () => {
    const before = useUIStore.getState().createTaskRequest.nonce;
    useUIStore.getState().openCreateTask({ customerId: 'c-1', title: 'Перезвонить' });
    const after = useUIStore.getState().createTaskRequest;

    expect(after.nonce).toBe(before + 1);
    expect(after.payload).toEqual({ customerId: 'c-1', title: 'Перезвонить' });
  });

  it('increments assistant prompt nonce', () => {
    const before = useUIStore.getState().assistantPromptRequest.nonce;
    useUIStore.getState().openAssistantPrompt('Что делать дальше?');
    const after = useUIStore.getState().assistantPromptRequest;

    expect(after.nonce).toBe(before + 1);
    expect(after.payload).toBe('Что делать дальше?');
  });
});
