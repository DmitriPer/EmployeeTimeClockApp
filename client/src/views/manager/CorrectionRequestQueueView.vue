<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  fetchCorrectionQueue,
  reviewCorrectionRequest,
  fetchRetroactiveQueue,
  reviewRetroactiveRequest,
  type CorrectionRequest,
  type PendingRetroactiveRequest,
} from '../../api/manager.js';

type Tab = 'edits' | 'missed';

const activeTab = ref<Tab>('edits');

const corrections = ref<CorrectionRequest[]>([]);
const retroactives = ref<PendingRetroactiveRequest[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const reviewingId = ref<number | null>(null);
const noteInput = ref('');

const TZ = 'Asia/Jerusalem';

onMounted(async () => {
  loading.value = true;
  try {
    [corrections.value, retroactives.value] = await Promise.all([
      fetchCorrectionQueue(),
      fetchRetroactiveQueue(),
    ]);
  } catch {
    error.value = 'Failed to load requests.';
  } finally {
    loading.value = false;
  }
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}

function startReview(id: number): void {
  reviewingId.value = id;
  noteInput.value = '';
}

async function submitCorrectionReview(id: number, action: 'APPROVED' | 'REJECTED'): Promise<void> {
  error.value = null;
  try {
    await reviewCorrectionRequest(id, action, noteInput.value || null);
    corrections.value = corrections.value.filter((r) => r.id !== id);
    reviewingId.value = null;
  } catch (e: any) {
    error.value = e?.response?.data?.error?.message ?? 'Failed to submit review.';
  }
}

async function submitRetroactiveReview(id: number, action: 'APPROVED' | 'REJECTED'): Promise<void> {
  error.value = null;
  try {
    await reviewRetroactiveRequest(id, action, noteInput.value || null);
    retroactives.value = retroactives.value.filter((r) => r.id !== id);
    reviewingId.value = null;
  } catch (e: any) {
    error.value = e?.response?.data?.error?.message ?? 'Failed to submit review.';
  }
}

function switchTab(tab: Tab): void {
  activeTab.value = tab;
  reviewingId.value = null;
  error.value = null;
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-base font-semibold text-gray-800">Entry Requests</h1>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-200">
      <button
        @click="switchTab('edits')"
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
        :class="activeTab === 'edits'
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        Entry Edits
        <span v-if="corrections.length" class="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
          {{ corrections.length }}
        </span>
      </button>
      <button
        @click="switchTab('missed')"
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
        :class="activeTab === 'missed'
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        Missed Days
        <span v-if="retroactives.length" class="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
          {{ retroactives.length }}
        </span>
      </button>
    </div>

    <div v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <div v-if="loading" class="text-sm text-gray-400">Loading…</div>

    <!-- Entry Edits tab -->
    <template v-else-if="activeTab === 'edits'">
      <div v-if="corrections.length === 0" class="text-sm text-gray-400">No pending edit requests.</div>
      <div v-else class="space-y-3">
        <div
          v-for="req in corrections"
          :key="req.id"
          class="rounded border border-gray-200 bg-white p-4 shadow-sm space-y-3"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="font-medium text-gray-800">
                {{ req.employeeName }}
                <span class="text-xs text-gray-400">({{ req.employeeId }})</span>
              </p>
              <p class="mt-0.5 text-xs text-gray-400">Submitted {{ formatDate(req.createdAt) }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 rounded bg-gray-50 p-3 text-xs text-gray-600">
            <div>
              <p class="mb-1 font-medium text-gray-500">Current</p>
              <p>{{ formatTime(req.currentClockInAt) }} — {{ req.currentClockOutAt ? formatTime(req.currentClockOutAt) : 'open' }}</p>
            </div>
            <div>
              <p class="mb-1 font-medium text-blue-600">Requested</p>
              <p>{{ formatTime(req.requestedClockInAt) }} — {{ req.requestedClockOutAt ? formatTime(req.requestedClockOutAt) : '—' }}</p>
              <p v-if="req.requestedBreaks && req.requestedBreaks.length > 0" class="mt-1 text-gray-500">
                Breaks: {{ req.requestedBreaks.map(b => `${b.start}–${b.end}`).join(', ') }}
              </p>
            </div>
          </div>

          <p class="text-sm italic text-gray-700">"{{ req.employeeNote }}"</p>

          <div v-if="reviewingId === req.id" class="space-y-2">
            <input v-model="noteInput" type="text" placeholder="Manager note (optional)" maxlength="1000"
              class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm" />
            <div class="flex gap-2">
              <button @click="submitCorrectionReview(req.id, 'APPROVED')"
                class="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700">Approve</button>
              <button @click="submitCorrectionReview(req.id, 'REJECTED')"
                class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Reject</button>
              <button @click="reviewingId = null" class="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
          <button v-else @click="startReview(req.id)" class="text-sm text-blue-600 hover:underline">Review</button>
        </div>
      </div>
    </template>

    <!-- Missed Days tab -->
    <template v-else-if="activeTab === 'missed'">
      <div v-if="retroactives.length === 0" class="text-sm text-gray-400">No pending missed-day requests.</div>
      <div v-else class="space-y-3">
        <div
          v-for="req in retroactives"
          :key="req.id"
          class="rounded border border-gray-200 bg-white p-4 shadow-sm space-y-3"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="font-medium text-gray-800">
                {{ req.employeeName }}
                <span class="text-xs text-gray-400">({{ req.employeeId }})</span>
              </p>
              <p class="mt-0.5 text-xs text-gray-400">Submitted {{ req.createdAt.slice(0, 10) }}</p>
            </div>
            <span class="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{{ req.date }}</span>
          </div>

          <div class="rounded bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
            <p>{{ req.clockInTime }} — {{ req.clockOutTime }}</p>
            <p v-if="req.breaks && req.breaks.length" class="text-gray-400">
              Breaks: {{ req.breaks.map(b => `${b.start}–${b.end}`).join(', ') }}
            </p>
          </div>

          <p class="text-sm italic text-gray-700">"{{ req.employeeNote }}"</p>

          <div v-if="reviewingId === req.id" class="space-y-2">
            <input v-model="noteInput" type="text" placeholder="Manager note (optional)" maxlength="1000"
              class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm" />
            <div class="flex gap-2">
              <button @click="submitRetroactiveReview(req.id, 'APPROVED')"
                class="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700">Approve</button>
              <button @click="submitRetroactiveReview(req.id, 'REJECTED')"
                class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Reject</button>
              <button @click="reviewingId = null" class="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
          <button v-else @click="startReview(req.id)" class="text-sm text-blue-600 hover:underline">Review</button>
        </div>
      </div>
    </template>
  </div>
</template>
