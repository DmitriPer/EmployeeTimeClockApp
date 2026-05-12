<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  fetchCorrectionQueue,
  reviewCorrectionRequest,
  type CorrectionRequest,
} from '../../api/manager.js';

const requests = ref<CorrectionRequest[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const reviewingId = ref<number | null>(null);
const noteInput = ref('');

const TZ = 'Asia/Jerusalem';

onMounted(async () => {
  loading.value = true;
  try {
    requests.value = await fetchCorrectionQueue();
  } catch {
    error.value = 'Failed to load correction requests.';
  } finally {
    loading.value = false;
  }
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
}

function startReview(id: number): void {
  reviewingId.value = id;
  noteInput.value = '';
}

async function submitReview(id: number, action: 'APPROVED' | 'REJECTED'): Promise<void> {
  error.value = null;
  try {
    await reviewCorrectionRequest(id, action, noteInput.value || null);
    requests.value = requests.value.filter((r) => r.id !== id);
    reviewingId.value = null;
  } catch (e: any) {
    error.value = e?.response?.data?.error?.message ?? 'Failed to submit review.';
  }
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-base font-semibold text-gray-800">Edit Request Queue</h1>

    <div v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <div v-if="loading" class="text-sm text-gray-400">Loading…</div>

    <div v-else-if="requests.length === 0" class="text-sm text-gray-400">
      No pending edit requests.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="req in requests"
        :key="req.id"
        class="rounded border border-gray-200 bg-white p-4 shadow-sm space-y-3"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="font-medium text-gray-800">
              {{ req.employeeName }}
              <span class="text-xs text-gray-400">({{ req.employeeId }})</span>
            </p>
            <p class="text-xs text-gray-400 mt-0.5">Submitted {{ formatDate(req.createdAt) }}</p>
          </div>
        </div>

        <!-- Current vs requested times -->
        <div class="grid grid-cols-2 gap-4 rounded bg-gray-50 p-3 text-xs text-gray-600">
          <div>
            <p class="font-medium text-gray-500 mb-1">Current</p>
            <p>{{ formatTime(req.currentClockInAt) }} — {{ req.currentClockOutAt ? formatTime(req.currentClockOutAt) : 'open' }}</p>
          </div>
          <div>
            <p class="font-medium text-blue-600 mb-1">Requested</p>
            <p>{{ formatTime(req.requestedClockInAt) }} — {{ req.requestedClockOutAt ? formatTime(req.requestedClockOutAt) : '—' }}</p>
            <p v-if="req.requestedBreaks && req.requestedBreaks.length > 0" class="mt-1 text-gray-500">
              Breaks: {{ req.requestedBreaks.map(b => `${b.start}–${b.end}`).join(', ') }}
            </p>
          </div>
        </div>

        <!-- Employee note -->
        <p class="text-sm text-gray-700 italic">"{{ req.employeeNote }}"</p>

        <!-- Inline review form -->
        <div v-if="reviewingId === req.id" class="space-y-2">
          <input
            v-model="noteInput"
            type="text"
            placeholder="Manager note (optional)"
            maxlength="1000"
            class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <div class="flex gap-2">
            <button
              @click="submitReview(req.id, 'APPROVED')"
              class="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
            >
              Approve
            </button>
            <button
              @click="submitReview(req.id, 'REJECTED')"
              class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
            >
              Reject
            </button>
            <button
              @click="reviewingId = null"
              class="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>

        <button
          v-else
          @click="startReview(req.id)"
          class="text-sm text-blue-600 hover:underline"
        >
          Review
        </button>
      </div>
    </div>
  </div>
</template>