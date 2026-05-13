<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ClockStatus } from '@app/shared';
import { useTimeclockStore } from '../stores/timeclock.js';
import * as timeclockApi from '../api/timeclock.js';
import type { ClockOutData } from '../api/timeclock.js';
import { fetchOwnProfile } from '../api/users.js';
import type { OwnProfile } from '../api/users.js';
import { formatDuration, formatMinutes, formatTime } from '../utils/format.js';
import { useAsyncData } from '../composables/useAsyncData.js';
import BaseButton from '../components/ui/BaseButton.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const store = useTimeclockStore();
const { loading, error, run: runAction } = useAsyncData<void>();
const clockOutSummary = ref<ClockOutData | null>(null);
const now = ref(new Date());
const profile = ref<OwnProfile | null>(null);

let ticker: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  try {
    const [status, own] = await Promise.all([timeclockApi.fetchStatus(), fetchOwnProfile()]);
    store.applyStatus(status);
    profile.value = own;
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


const handleClockIn = (): Promise<void | null> => {
  clockOutSummary.value = null;
  return runAction(async () => {
    store.applyStatus(await timeclockApi.clockIn());
  }, 'Could not clock in. Please try again.');
};

const handleClockOut = (): Promise<void | null> =>
  runAction(async () => {
    clockOutSummary.value = await timeclockApi.clockOut();
    store.reset();
  }, 'Could not clock out. Please try again.');

const handleBreakStart = (): Promise<void | null> =>
  runAction(async () => {
    store.applyStatus(await timeclockApi.startBreak());
  }, 'Could not start break. Please try again.');

const handleBreakEnd = (): Promise<void | null> =>
  runAction(async () => {
    store.applyStatus(await timeclockApi.endBreak());
  }, 'Could not end break. Please try again.');
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
      <BaseButton variant="ghost" size="sm" @click="clockOutSummary = null">Dismiss</BaseButton>
    </div>

    <!-- Main clock card -->
    <div v-if="!clockOutSummary" class="rounded border border-gray-200 bg-white p-8 shadow-sm space-y-6">

      <!-- Manager info -->
      <div v-if="profile?.managerName" class="text-center text-xs text-gray-400">
        Manager: <span class="text-gray-600">{{ profile.managerName }}</span>
      </div>

      <!-- Status + elapsed -->
      <div class="text-center space-y-2">
        <StatusBadge
          size="md"
          variant="custom"
          :tone="store.status === ClockStatus.NOT_CLOCKED_IN ? 'gray' : store.status === ClockStatus.WORKING ? 'green' : 'blue'"
          :label="store.status === ClockStatus.NOT_CLOCKED_IN ? 'Not Clocked In' : store.status === ClockStatus.WORKING ? 'Working' : 'On Break'"
        />

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
        <BaseButton
          v-if="store.status === ClockStatus.NOT_CLOCKED_IN"
          size="lg" :loading="loading" class="w-full"
          @click="handleClockIn"
        >Clock In</BaseButton>

        <template v-if="store.status === ClockStatus.WORKING">
          <BaseButton
            variant="secondary" size="lg" :loading="loading" class="w-full"
            @click="handleBreakStart"
          >Start Break</BaseButton>
          <BaseButton
            variant="dark" size="lg" :loading="loading" class="w-full"
            @click="handleClockOut"
          >Clock Out</BaseButton>
        </template>

        <BaseButton
          v-if="store.status === ClockStatus.ON_BREAK"
          size="lg" :loading="loading" class="w-full"
          @click="handleBreakEnd"
        >End Break</BaseButton>
      </div>
    </div>
  </div>
</template>
