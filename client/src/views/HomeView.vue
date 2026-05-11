<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ClockStatus } from '@app/shared';
import { useTimeclockStore } from '../stores/timeclock.js';
import * as timeclockApi from '../api/timeclock.js';
import type { ClockOutData } from '../api/timeclock.js';

const store = useTimeclockStore();
const loading = ref(false);
const error = ref<string | null>(null);
const clockOutSummary = ref<ClockOutData | null>(null);
const now = ref(new Date());

let ticker: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  try {
    const data = await timeclockApi.fetchStatus();
    store.applyStatus(data);
  } catch {
    error.value = 'Failed to load clock status.';
  }
  ticker = setInterval(() => { now.value = new Date(); }, 1000);
});

onUnmounted(() => { if (ticker) clearInterval(ticker); });

const grossMs = computed(() =>
  store.clockInAt ? now.value.getTime() - new Date(store.clockInAt).getTime() : 0,
);

const currentBreakMs = computed(() =>
  store.breakStartAt && store.status === ClockStatus.ON_BREAK
    ? now.value.getTime() - new Date(store.breakStartAt).getTime()
    : 0,
);

const totalLiveBreakMinutes = computed(
  () => store.totalBreakMinutes + Math.floor(currentBreakMs.value / 60_000),
);

const excessBreakMinutes = computed(() => Math.max(0, totalLiveBreakMinutes.value - 60));
const grossMinutes = computed(() => Math.floor(grossMs.value / 60_000));
const overtimeMinutes = computed(() => Math.max(0, grossMinutes.value - 9 * 60));

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
  });
}

async function handleClockIn(): Promise<void> {
  error.value = null;
  clockOutSummary.value = null;
  loading.value = true;
  try {
    const data = await timeclockApi.clockIn();
    store.applyStatus(data);
  } catch {
    error.value = 'Could not clock in. Please try again.';
  } finally {
    loading.value = false;
  }
}

async function handleClockOut(): Promise<void> {
  error.value = null;
  loading.value = true;
  try {
    const data = await timeclockApi.clockOut();
    clockOutSummary.value = data;
    store.reset();
  } catch {
    error.value = 'Could not clock out. Please try again.';
  } finally {
    loading.value = false;
  }
}

async function handleBreakStart(): Promise<void> {
  error.value = null;
  loading.value = true;
  try {
    const data = await timeclockApi.startBreak();
    store.applyStatus(data);
  } catch {
    error.value = 'Could not start break. Please try again.';
  } finally {
    loading.value = false;
  }
}

async function handleBreakEnd(): Promise<void> {
  error.value = null;
  loading.value = true;
  try {
    const data = await timeclockApi.endBreak();
    store.applyStatus(data);
  } catch {
    error.value = 'Could not end break. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-6 pt-4">

    <!-- Error banner -->
    <div v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Clock-out summary card -->
    <div v-if="clockOutSummary" class="rounded border border-gray-200 bg-white p-6 shadow-sm space-y-3">
      <p class="font-medium text-gray-800">Clocked out at {{ formatTime(clockOutSummary.clockOutAt) }}</p>
      <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <span>Gross time</span>
        <span class="font-medium text-gray-800">{{ formatMinutes(clockOutSummary.grossMinutes) }}</span>
        <span>Break time</span>
        <span class="font-medium text-gray-800">{{ formatMinutes(clockOutSummary.totalBreakMinutes) }}</span>
        <span>Paid hours</span>
        <span class="font-medium text-gray-800">{{ formatMinutes(clockOutSummary.paidMinutes) }}</span>
      </div>
      <div v-if="clockOutSummary.overtimeMinutes > 0" class="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
        Overtime: {{ formatMinutes(clockOutSummary.overtimeMinutes) }} — request submitted automatically.
      </div>
      <div v-if="clockOutSummary.isFlagged" class="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
        Break was auto-closed at clock-out. This session has been flagged for manager review.
      </div>
      <button @click="clockOutSummary = null" class="text-sm text-gray-400 hover:text-gray-600">Dismiss</button>
    </div>

    <!-- Main clock card -->
    <div v-if="!clockOutSummary" class="rounded border border-gray-200 bg-white p-8 shadow-sm space-y-6">

      <!-- Status + elapsed -->
      <div class="text-center space-y-2">
        <span
          class="inline-block rounded-full px-4 py-1 text-sm font-medium"
          :class="{
            'bg-gray-100 text-gray-500': store.status === ClockStatus.NOT_CLOCKED_IN,
            'bg-green-100 text-green-700': store.status === ClockStatus.WORKING,
            'bg-blue-100 text-blue-700': store.status === ClockStatus.ON_BREAK,
          }"
        >
          {{ store.status === ClockStatus.NOT_CLOCKED_IN ? 'Not Clocked In'
           : store.status === ClockStatus.WORKING ? 'Working'
           : 'On Break' }}
        </span>

        <p v-if="store.clockInAt" class="text-xs text-gray-400">
          Since {{ formatTime(store.clockInAt) }}
        </p>

        <p v-if="store.status !== ClockStatus.NOT_CLOCKED_IN" class="text-4xl font-mono font-light text-gray-800 tracking-widest">
          {{ formatDuration(grossMs) }}
        </p>
      </div>

      <!-- Break section -->
      <div v-if="store.status !== ClockStatus.NOT_CLOCKED_IN" class="space-y-2">
        <div v-if="store.status === ClockStatus.ON_BREAK" class="text-center">
          <p class="text-xs text-gray-400 mb-1">Break elapsed</p>
          <p class="text-2xl font-mono text-blue-600">{{ formatDuration(currentBreakMs) }}</p>
        </div>

        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">Break used</span>
          <span :class="excessBreakMinutes > 0 ? 'text-amber-600 font-medium' : 'text-gray-700'">
            {{ formatMinutes(totalLiveBreakMinutes) }} / 60m
          </span>
        </div>

        <div v-if="excessBreakMinutes > 0" class="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {{ formatMinutes(excessBreakMinutes) }} excess break — will be deducted from paid hours.
        </div>

        <div v-if="overtimeMinutes > 0" class="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Overtime: {{ formatMinutes(overtimeMinutes) }} over the 9-hour threshold.
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex flex-col gap-3">
        <button
          v-if="store.status === ClockStatus.NOT_CLOCKED_IN"
          @click="handleClockIn"
          :disabled="loading"
          class="w-full rounded bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Clock In
        </button>

        <template v-if="store.status === ClockStatus.WORKING">
          <button
            @click="handleBreakStart"
            :disabled="loading"
            class="w-full rounded border border-gray-300 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Start Break
          </button>
          <button
            @click="handleClockOut"
            :disabled="loading"
            class="w-full rounded bg-gray-800 px-4 py-3 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
          >
            Clock Out
          </button>
        </template>

        <button
          v-if="store.status === ClockStatus.ON_BREAK"
          @click="handleBreakEnd"
          :disabled="loading"
          class="w-full rounded bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          End Break
        </button>
      </div>
    </div>
  </div>
</template>
