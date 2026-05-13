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

function statusClass(status: string): string {
  if (status === 'APPROVED') return 'bg-green-100 text-green-700';
  if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-700';
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-gray-700">Retroactive Entry Requests</h2>
      <button
        v-if="isViewingCurrentMonth && !showModal && !hasPending"
        @click="openModal"
        class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
      >
        Request Missing Entry
      </button>
    </div>

    <div v-if="error" class="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {{ error }}
    </div>

    <div v-if="loading" class="text-sm text-gray-400">Loading…</div>

    <div v-else-if="requests.length === 0" class="text-sm text-gray-400">
      No retroactive requests for this month.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="req in requests"
        :key="req.id"
        class="rounded border border-gray-200 bg-white p-3 text-sm space-y-1"
      >
        <div class="flex items-center justify-between">
          <span class="font-medium text-gray-700">{{ req.date }}</span>
          <span class="rounded-full px-2 py-0.5 text-xs" :class="statusClass(req.status)">
            {{ req.status.charAt(0) + req.status.slice(1).toLowerCase() }}
          </span>
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
  </div>

  <!-- New Retroactive Entry Modal -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="closeModal"
    >
      <div class="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <p class="font-semibold text-gray-800">Request Missing Entry</p>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div class="px-6 py-5 space-y-4">
          <label class="flex flex-col gap-1 text-sm text-gray-600">
            Date
            <input
              v-model="formDate"
              type="date"
              :min="monthMin"
              :max="today"
              required
              class="w-40 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
            />
          </label>

          <div class="grid grid-cols-2 gap-4">
            <label class="flex flex-col gap-1 text-sm text-gray-600">
              Clock In
              <TimeInput v-model="formClockIn" :required="true" input-class="rounded border px-2 py-1.5 text-sm" />
            </label>
            <label class="flex flex-col gap-1 text-sm text-gray-600">
              Clock Out
              <TimeInput v-model="formClockOut" :required="true" input-class="rounded border px-2 py-1.5 text-sm" />
            </label>
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

          <label class="flex flex-col gap-1 text-sm text-gray-600">
            Reason <span class="text-red-500">*</span>
            <textarea
              v-model="formNote"
              rows="2"
              maxlength="1000"
              placeholder="Explain why this entry was missed"
              class="resize-none rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
            />
          </label>

          <div v-if="formError" class="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {{ formError }}
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            @click="closeModal"
            class="rounded border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            @click="submitForm"
            :disabled="submitting"
            class="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ submitting ? 'Submitting…' : 'Submit' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
