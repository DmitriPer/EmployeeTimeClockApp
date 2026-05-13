<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchOvertimeQueue, reviewOvertime, type OvertimeRequest } from '../../api/manager.js';
import { formatDate, formatTime, formatMinutes } from '../../utils/format.js';
import { useAsyncData } from '../../composables/useAsyncData.js';
import ReviewCard from '../../components/data/ReviewCard.vue';
import AsyncSection from '../../components/ui/AsyncSection.vue';

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

    <AsyncSection :loading="loading" :error="error" :empty="requests.length === 0" empty-text="No pending overtime requests.">
      <div class="space-y-3">
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
    </AsyncSection>
  </div>
</template>
