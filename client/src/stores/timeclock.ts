import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ClockStatus } from '@app/shared';
import type { ClockStatusData } from '../api/timeclock.js';

export const useTimeclockStore = defineStore('timeclock', () => {
  const status = ref<ClockStatus>(ClockStatus.NOT_CLOCKED_IN);
  const entryId = ref<number | null>(null);
  const clockInAt = ref<string | null>(null);
  const breakStartAt = ref<string | null>(null);
  const totalBreakMinutes = ref<number>(0);

  function applyStatus(data: ClockStatusData): void {
    status.value = data.status;
    entryId.value = data.entryId ?? null;
    clockInAt.value = data.clockInAt ?? null;
    breakStartAt.value = data.breakStartAt ?? null;
    totalBreakMinutes.value = data.totalBreakMinutes;
  }

  function reset(): void {
    status.value = ClockStatus.NOT_CLOCKED_IN;
    entryId.value = null;
    clockInAt.value = null;
    breakStartAt.value = null;
    totalBreakMinutes.value = 0;
  }

  return { status, entryId, clockInAt, breakStartAt, totalBreakMinutes, applyStatus, reset };
});
