<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchOvertimeQueue, reviewOvertime, type OvertimeRequest } from '../../api/manager.js';
import { formatDate, formatTime, formatMinutes } from '../../utils/format.js';
import { useAsyncData } from '../../composables/useAsyncData.js';
import ReviewCard from '../../components/data/ReviewCard.vue';

const requests = ref<OvertimeRequest[]>([]);
const { loading, error, run: runLoad } = useAsyncData<OvertimeRequest[]>();
const reviewingId = ref<number | null>(null);

onMounted(async () => {
  const result = await runLoad(() => fetchOvertimeQueue(), 'Failed to load overtime requests.');
  if (result !== null) requests.value = result;
});

async function handleApprove(req: OvertimeRequest, note: string | null): Promise<void> {
  error.value = null;
  try {
    await reviewOvertime(req.id, 'APPROVED', note);
    requests.value = requests.value.filter((r) => r.id !== req.id);
    reviewingId.value = null;
  } catch {
    error.value = 'Failed to submit review.';
  }
}

async function handleReject(req: OvertimeRequest, note: string | null): Promise<void> {
  error.value = null;
  try {
    await reviewOvertime(req.id, 'REJECTED', note);
    requests.value = requests.value.filter((r) => r.id !== req.id);
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
      <ReviewCard
        v-for="req in requests"
        :key="req.id"
        :title="req.employeeName"
        :subtitle="`(${req.employeeId})`"
        :timestamp="`${formatDate(req.clockInAt)} — ${formatTime(req.clockInAt)} to ${req.clockOutAt ? formatTime(req.clockOutAt) : '—'}`"
        :header-badge="{ variant: 'custom', tone: 'amber', label: `+${formatMinutes(req.overtimeMinutes)} OT` }"
        :reviewing="reviewingId === req.id"
        @start-review="reviewingId = req.id"
        @cancel="reviewingId = null"
        @approve="(note) => handleApprove(req, note)"
        @reject="(note) => handleReject(req, note)"
      />
    </div>
  </div>
</template>
