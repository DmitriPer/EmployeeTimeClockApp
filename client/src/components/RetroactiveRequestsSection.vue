<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { DateTime } from 'luxon';
import type { BreakInput } from '../api/correctionRequests.js';
import { getApiErrorMessage } from '../api/utils.js';
import { APP_TIMEZONE } from '../config/app.js';
import { useAsyncData } from '../composables/useAsyncData.js';
import {
  getMyRetroactiveRequests,
  submitRetroactiveRequest,
  cancelRetroactiveRequest,
  type RetroactiveRequestResult,
} from '../api/retroactiveRequests.js';
import TimeInput from './TimeInput.vue';
import BaseModal from './ui/BaseModal.vue';
import StatusBadge from './ui/StatusBadge.vue';
import AsyncSection from './ui/AsyncSection.vue';
import FormField from './ui/FormField.vue';
import BaseButton from './ui/BaseButton.vue';

const props = defineProps<{ month: string }>();

const allRequests = ref<RetroactiveRequestResult[]>([]);
const { loading, error, run: runLoad } = useAsyncData<RetroactiveRequestResult[]>();

const showModal = ref(false);
const formDate = ref('');
const formClockIn = ref('');
const formClockOut = ref('');
const formBreaks = ref<BreakInput[]>([]);
const formNote = ref('');
const submitting = ref(false);
const formError = ref<string | null>(null);

const currentMonth = computed(() => DateTime.now().setZone(APP_TIMEZONE).toFormat('yyyy-MM'));
const isViewingCurrentMonth = computed(() => props.month === currentMonth.value);

const requests = computed(() =>
  allRequests.value.filter((r) => r.date.startsWith(props.month)),
);

const hasPending = computed(() => allRequests.value.some((r) => r.status === 'PENDING'));

const today = computed(() => DateTime.now().setZone(APP_TIMEZONE).toISODate()!);
const monthMin = computed(() => DateTime.now().setZone(APP_TIMEZONE).startOf('month').toISODate()!);

onMounted(async () => {
  const result = await runLoad(() => getMyRetroactiveRequests(), 'Failed to load requests.');
  if (result !== null) allRequests.value = result;
});

function openModal(): void {
  formDate.value = today.value;
  formClockIn.value = '';
  formClockOut.value = '';
  formBreaks.value = [];
  formNote.value = '';
  formError.value = null;
  showModal.value = true;
}

function closeModal(): void {
  showModal.value = false;
  formError.value = null;
}

function addBreak(): void {
  formBreaks.value.push({ start: '', end: '' });
}

function removeBreak(idx: number): void {
  formBreaks.value.splice(idx, 1);
}

async function submitForm(): Promise<void> {
  if (!formNote.value.trim()) {
    formError.value = 'An explanation is required.';
    return;
  }
  submitting.value = true;
  formError.value = null;
  try {
    const result = await submitRetroactiveRequest({
      date: formDate.value,
      clockInTime: formClockIn.value,
      clockOutTime: formClockOut.value,
      breaks: formBreaks.value.length ? formBreaks.value : undefined,
      employeeNote: formNote.value,
    });
    allRequests.value = [result, ...allRequests.value];
    closeModal();
  } catch (e: unknown) {
    formError.value = getApiErrorMessage(e, 'Failed to submit request.');
  } finally {
    submitting.value = false;
  }
}

async function handleCancel(id: number): Promise<void> {
  error.value = null;
  try {
    await cancelRetroactiveRequest(id);
    allRequests.value = allRequests.value.filter((r) => r.id !== id);
  } catch {
    error.value = 'Failed to cancel request.';
  }
}

</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-gray-700">Retroactive Entry Requests</h2>
      <BaseButton
        v-if="isViewingCurrentMonth && !showModal && !hasPending"
        @click="openModal"
      >Request Missing Entry</BaseButton>
    </div>

    <AsyncSection :loading="loading" :error="error" :empty="requests.length === 0" empty-text="No retroactive requests for this month.">
    <div class="space-y-2">
      <div
        v-for="req in requests"
        :key="req.id"
        class="rounded border border-gray-200 bg-white p-3 text-sm space-y-1"
      >
        <div class="flex items-center justify-between">
          <span class="font-medium text-gray-700">{{ req.date }}</span>
          <StatusBadge
            :variant="req.status === 'APPROVED' ? 'approved' : req.status === 'REJECTED' ? 'rejected' : 'pending'"
          />
        </div>
        <p class="text-xs text-gray-500">{{ req.clockInTime }} — {{ req.clockOutTime }}</p>
        <p v-if="req.breaks && req.breaks.length" class="text-xs text-gray-400">
          Breaks: {{ req.breaks.map((b) => `${b.start}–${b.end}`).join(', ') }}
        </p>
        <p class="text-xs italic text-gray-500">"{{ req.employeeNote }}"</p>
        <p v-if="req.managerNote" class="text-xs text-gray-400">Manager: "{{ req.managerNote }}"</p>
        <button
          v-if="req.status === 'PENDING'"
          @click="handleCancel(req.id)"
          class="text-xs text-red-500 hover:text-red-700 hover:underline"
        >
          Cancel request
        </button>
      </div>
    </div>
    </AsyncSection>
  </div>

  <!-- New Retroactive Entry Modal -->
  <BaseModal
    v-model:open="showModal"
    title="Request Missing Entry"
    size="md"
    @close="closeModal"
  >
    <div class="space-y-4">
      <FormField label="Date" v-slot="{ id }">
        <input
          :id="id"
          v-model="formDate"
          type="date"
          :min="monthMin"
          :max="today"
          required
          class="w-40 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
        />
      </FormField>

      <div class="grid grid-cols-2 gap-4">
        <FormField label="Clock In" v-slot="{ id }">
          <TimeInput :id="id" v-model="formClockIn" :required="true" input-class="rounded border px-2 py-1.5 text-sm" />
        </FormField>
        <FormField label="Clock Out" v-slot="{ id }">
          <TimeInput :id="id" v-model="formClockOut" :required="true" input-class="rounded border px-2 py-1.5 text-sm" />
        </FormField>
      </div>

      <div class="space-y-2">
        <p class="text-sm text-gray-600">Breaks <span class="text-gray-400 text-xs">(optional)</span></p>
        <div v-for="(b, i) in formBreaks" :key="i" class="flex items-center gap-2">
          <TimeInput v-model="b.start" input-class="w-28 rounded border px-2 py-1 text-sm" />
          <span class="text-xs text-gray-400">to</span>
          <TimeInput v-model="b.end" input-class="w-28 rounded border px-2 py-1 text-sm" />
          <button @click="removeBreak(i)" aria-label="Remove break"
            class="text-xs text-red-400 hover:text-red-600">✕</button>
        </div>
        <button @click="addBreak" class="text-xs text-blue-600 hover:underline">+ Add break</button>
      </div>

      <FormField label="Reason" :required="true" v-slot="{ id, ariaDescribedby }">
        <textarea
          :id="id"
          :aria-describedby="ariaDescribedby"
          v-model="formNote"
          rows="2"
          maxlength="1000"
          placeholder="Explain why this entry was missed"
          class="resize-none rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
        />
      </FormField>

      <div v-if="formError" class="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {{ formError }}
      </div>
    </div>

    <template #footer>
      <button
        @click="closeModal"
        class="rounded border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
      >
        Cancel
      </button>
      <BaseButton @click="submitForm" :loading="submitting">
        {{ submitting ? 'Submitting…' : 'Submit' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
