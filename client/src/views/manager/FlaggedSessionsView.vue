<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { fetchFlaggedSessions, reviewFlaggedSession, type FlaggedSession } from '../../api/manager.js';
import TimeInput from '../../components/TimeInput.vue';
import BaseModal from '../../components/ui/BaseModal.vue';
import StatusBadge from '../../components/ui/StatusBadge.vue';
import { formatDate, formatTime } from '../../utils/format.js';
import { getApiErrorMessage } from '../../api/utils.js';
import { useAsyncData } from '../../composables/useAsyncData.js';
import AsyncSection from '../../components/ui/AsyncSection.vue';

const sessions = ref<FlaggedSession[]>([]);
const { loading, error, run: runLoad } = useAsyncData<FlaggedSession[]>();
const fixingSession = ref<FlaggedSession | null>(null);
const fixingOpen = ref(false);
const breakEndInput = ref('');
const submitting = ref(false);
const formError = ref<string | null>(null);

onMounted(async () => {
  const result = await runLoad(() => fetchFlaggedSessions(), 'Failed to load flagged sessions.');
  if (result !== null) sessions.value = result;
});

function openModal(s: FlaggedSession): void {
  fixingSession.value = s;
  breakEndInput.value = s.breakEndAt ? formatTime(s.breakEndAt) : '';
  formError.value = null;
  fixingOpen.value = true;
}

function closeModal(): void {
  fixingOpen.value = false;
  fixingSession.value = null;
  formError.value = null;
}

const modalSubtitle = computed(() =>
  fixingSession.value
    ? `${fixingSession.value.employeeName} · ${formatDate(fixingSession.value.clockInAt)}`
    : '',
);

async function submitFix(): Promise<void> {
  if (!fixingSession.value) return;
  if (!breakEndInput.value) {
    formError.value = 'Break end time is required.';
    return;
  }
  submitting.value = true;
  formError.value = null;
  try {
    await reviewFlaggedSession(fixingSession.value.timeEntryId, breakEndInput.value);
    const idx = sessions.value.findIndex((x) => x.timeEntryId === fixingSession.value!.timeEntryId);
    if (idx !== -1) {
      sessions.value[idx] = {
        ...sessions.value[idx],
        breakEndAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        reviewedByName: 'You',
      };
    }
    closeModal();
  } catch (e: unknown) {
    formError.value = getApiErrorMessage(e, 'Failed to save correction.');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-base font-semibold text-gray-800">Flagged Sessions</h1>

    <AsyncSection :loading="loading" :error="error" :empty="sessions.length === 0" empty-text="No flagged sessions.">
    <div class="overflow-x-auto rounded border border-gray-200">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
          <tr>
            <th class="px-4 py-2">Employee</th>
            <th class="px-4 py-2">Date</th>
            <th class="px-4 py-2">In</th>
            <th class="px-4 py-2">Out</th>
            <th class="px-4 py-2">Reason</th>
            <th class="px-4 py-2">Corrections</th>
            <th class="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-for="s in sessions" :key="s.timeEntryId" class="hover:bg-gray-50">
            <td class="px-4 py-2">
              <span class="font-medium text-gray-800">{{ s.employeeName }}</span>
              <span class="ml-1 text-xs text-gray-400">{{ s.employeeId }}</span>
            </td>
            <td class="px-4 py-2 text-gray-700">{{ formatDate(s.clockInAt) }}</td>
            <td class="px-4 py-2 text-gray-700">{{ formatTime(s.clockInAt) }}</td>
            <td class="px-4 py-2 text-gray-500">{{ s.clockOutAt ? formatTime(s.clockOutAt) : '—' }}</td>
            <td class="px-4 py-2">
              <StatusBadge variant="custom" tone="amber" label="Break auto-closed" />
            </td>
            <td class="px-4 py-2 text-xs text-gray-500">
              {{ s.correctionCount > 0 ? `${s.correctionCount} correction(s)` : '—' }}
            </td>
            <td class="px-4 py-2">
              <StatusBadge v-if="s.reviewedAt" variant="break-fixed" :label="`Reviewed by ${s.reviewedByName}`" />
              <button
                v-else
                @click="openModal(s)"
                class="rounded bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700"
              >
                Fix
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    </AsyncSection>
  </div>

  <!-- Fix Modal -->
  <BaseModal
    v-model:open="fixingOpen"
    title="Fix Break End Time"
    :subtitle="modalSubtitle"
    @close="closeModal"
  >
    <div v-if="fixingSession" class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1 text-xs text-gray-500">
        Clock In
        <input
          :value="formatTime(fixingSession.clockInAt)"
          type="text" disabled
          class="rounded border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-500"
        />
      </label>
      <label class="flex flex-col gap-1 text-xs text-gray-500">
        Clock Out
        <input
          :value="fixingSession.clockOutAt ? formatTime(fixingSession.clockOutAt) : '—'"
          type="text" disabled
          class="rounded border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-500"
        />
      </label>
      <label class="flex flex-col gap-1 text-xs text-gray-500">
        Break Start
        <input
          :value="fixingSession.breakStartAt ? formatTime(fixingSession.breakStartAt) : '—'"
          type="text" disabled
          class="rounded border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-500"
        />
      </label>
      <label class="flex flex-col gap-1 text-xs font-medium text-blue-700">
        Break End *
        <TimeInput v-model="breakEndInput" input-class="rounded border border-blue-300 px-2 py-1.5 text-sm" />
      </label>
    </div>

    <div v-if="formError" class="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {{ formError }}
    </div>

    <template #footer>
      <button
        @click="closeModal"
        class="rounded border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        @click="submitFix"
        :disabled="submitting"
        class="rounded bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
      >
        {{ submitting ? 'Saving…' : 'Save' }}
      </button>
    </template>
  </BaseModal>
</template>
