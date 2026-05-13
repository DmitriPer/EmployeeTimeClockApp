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
import { formatDate, formatTime } from '../../utils/format.js';
import { getApiErrorMessage } from '../../api/utils.js';
import { useAsyncData } from '../../composables/useAsyncData.js';
import ReviewCard from '../../components/data/ReviewCard.vue';
import AsyncSection from '../../components/ui/AsyncSection.vue';

type Tab = 'edits' | 'missed';

const activeTab = ref<Tab>('edits');

const corrections = ref<CorrectionRequest[]>([]);
const retroactives = ref<PendingRetroactiveRequest[]>([]);
const { loading, error, run: runLoad } = useAsyncData<[CorrectionRequest[], PendingRetroactiveRequest[]]>();
const reviewingId = ref<number | null>(null);

onMounted(async () => {
  const result = await runLoad(
    () => Promise.all([fetchCorrectionQueue(), fetchRetroactiveQueue()]),
    'Failed to load requests.',
  );
  if (result !== null) {
    [corrections.value, retroactives.value] = result;
  }
});

async function submitCorrectionReview(req: CorrectionRequest, action: 'APPROVED' | 'REJECTED', note: string | null): Promise<void> {
  error.value = null;
  try {
    await reviewCorrectionRequest(req.id, action, note);
    corrections.value = corrections.value.filter((r) => r.id !== req.id);
    reviewingId.value = null;
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e, 'Failed to submit review.');
  }
}

async function submitRetroactiveReview(req: PendingRetroactiveRequest, action: 'APPROVED' | 'REJECTED', note: string | null): Promise<void> {
  error.value = null;
  try {
    await reviewRetroactiveRequest(req.id, action, note);
    retroactives.value = retroactives.value.filter((r) => r.id !== req.id);
    reviewingId.value = null;
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e, 'Failed to submit review.');
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

    <AsyncSection :loading="loading" :error="error">
    <!-- Entry Edits tab -->
    <template v-if="activeTab === 'edits'">
      <div v-if="corrections.length === 0" class="text-sm text-gray-400">No pending edit requests.</div>
      <div v-else class="space-y-3">
        <ReviewCard
          v-for="req in corrections"
          :key="req.id"
          :title="req.employeeName"
          :subtitle="`(${req.employeeId})`"
          :timestamp="`Submitted ${formatDate(req.createdAt)}`"
          :reviewing="reviewingId === req.id"
          note-placeholder="Manager note (optional)"
          @start-review="reviewingId = req.id"
          @cancel="reviewingId = null"
          @approve="(note) => submitCorrectionReview(req, 'APPROVED', note)"
          @reject="(note) => submitCorrectionReview(req, 'REJECTED', note)"
        >
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
        </ReviewCard>
      </div>
    </template>

    <!-- Missed Days tab -->
    <template v-else-if="activeTab === 'missed'">
      <div v-if="retroactives.length === 0" class="text-sm text-gray-400">No pending missed-day requests.</div>
      <div v-else class="space-y-3">
        <ReviewCard
          v-for="req in retroactives"
          :key="req.id"
          :title="req.employeeName"
          :subtitle="`(${req.employeeId})`"
          :timestamp="`Submitted ${req.createdAt.slice(0, 10)}`"
          :header-badge="{ variant: 'custom', tone: 'gray', label: req.date }"
          :reviewing="reviewingId === req.id"
          note-placeholder="Manager note (optional)"
          @start-review="reviewingId = req.id"
          @cancel="reviewingId = null"
          @approve="(note) => submitRetroactiveReview(req, 'APPROVED', note)"
          @reject="(note) => submitRetroactiveReview(req, 'REJECTED', note)"
        >
          <div class="rounded bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
            <p>{{ req.clockInTime }} — {{ req.clockOutTime }}</p>
            <p v-if="req.breaks && req.breaks.length" class="text-gray-400">
              Breaks: {{ req.breaks.map(b => `${b.start}–${b.end}`).join(', ') }}
            </p>
          </div>
          <p class="text-sm italic text-gray-700">"{{ req.employeeNote }}"</p>
        </ReviewCard>
      </div>
    </template>
    </AsyncSection>
  </div>
</template>
