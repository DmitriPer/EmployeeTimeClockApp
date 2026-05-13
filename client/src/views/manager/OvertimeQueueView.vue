<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchOvertimeQueue, reviewOvertime, type OvertimeRequest } from '../../api/manager.js';
import { formatDate, formatTime, formatMinutes } from '../../utils/format.js';
import { useAsyncData } from '../../composables/useAsyncData.js';
import StatusBadge from '../../components/ui/StatusBadge.vue';

const requests = ref<OvertimeRequest[]>([]);
const { loading, error, run: runLoad } = useAsyncData<OvertimeRequest[]>();
const reviewingId = ref<number | null>(null);
const noteInput = ref('');

onMounted(async () => {
  const result = await runLoad(() => fetchOvertimeQueue(), 'Failed to load overtime requests.');
  if (result !== null) requests.value = result;
});


function startReview(id: number): void {
  reviewingId.value = id;
  noteInput.value = '';
}

async function submitReview(id: number, action: 'APPROVED' | 'REJECTED'): Promise<void> {
  error.value = null;
  try {
    await reviewOvertime(id, action, noteInput.value || null);
    requests.value = requests.value.filter((r) => r.id !== id);
    reviewingId.value = null;
  } catch {
    error.value = 'Failed to submit review.';
  }
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-base font-semibold text-gray-800">Overtime Queue</h1>

    <div v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <div v-if="loading" class="text-sm text-gray-400">Loading…</div>

    <div v-else-if="requests.length === 0" class="text-sm text-gray-400">
      No pending overtime requests.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="req in requests"
        :key="req.id"
        class="rounded border border-gray-200 bg-white p-4 shadow-sm space-y-3"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="font-medium text-gray-800">{{ req.employeeName }} <span class="text-xs text-gray-400">({{ req.employeeId }})</span></p>
            <p class="text-sm text-gray-500">
              {{ formatDate(req.clockInAt) }} &mdash;
              {{ formatTime(req.clockInAt) }} to {{ req.clockOutAt ? formatTime(req.clockOutAt) : '—' }}
            </p>
          </div>
          <StatusBadge variant="custom" tone="amber" :label="`+${formatMinutes(req.overtimeMinutes)} OT`" />
        </div>

        <!-- Inline review form -->
        <div v-if="reviewingId === req.id" class="space-y-2">
          <input
            v-model="noteInput"
            type="text"
            placeholder="Note (optional)"
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
