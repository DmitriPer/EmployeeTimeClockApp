<script setup lang="ts">
import { ref, watch } from 'vue';
import type { StatusVariant, StatusTone } from '../ui/types.js';
import StatusBadge from '../ui/StatusBadge.vue';
import BaseButton from '../ui/BaseButton.vue';

const props = withDefaults(defineProps<{
  title: string;
  subtitle?: string;
  timestamp?: string;
  headerBadge?: { variant: StatusVariant; label?: string; tone?: StatusTone };
  reviewing?: boolean;
  notePlaceholder?: string;
  noteRequired?: boolean;
}>(), {
  reviewing: false,
  notePlaceholder: 'Note (optional)',
  noteRequired: false,
});

const emit = defineEmits<{
  (e: 'start-review'): void;
  (e: 'cancel'): void;
  (e: 'approve', note: string | null): void;
  (e: 'reject', note: string | null): void;
}>();

const note = ref('');
watch(() => props.reviewing, (v) => { if (!v) note.value = ''; });

function submit(action: 'approve' | 'reject'): void {
  const trimmed = note.value.trim() || null;
  if (props.noteRequired && !trimmed) return;
  if (action === 'approve') emit('approve', trimmed);
  else emit('reject', trimmed);
}
</script>

<template>
  <article class="rounded border border-gray-200 bg-white p-4 shadow-sm space-y-3">
    <header class="flex items-start justify-between gap-3">
      <div>
        <p class="font-medium text-gray-800">
          {{ title }}
          <span v-if="subtitle" class="ml-1 text-xs text-gray-400">{{ subtitle }}</span>
        </p>
        <p v-if="timestamp" class="mt-0.5 text-xs text-gray-400">{{ timestamp }}</p>
      </div>
      <StatusBadge
        v-if="headerBadge"
        :variant="headerBadge.variant"
        :label="headerBadge.label"
        :tone="headerBadge.tone"
      />
    </header>

    <div class="text-sm text-gray-700"><slot /></div>

    <footer class="pt-1">
      <div v-if="!reviewing" class="flex justify-end">
        <BaseButton size="sm" variant="primary" @click="emit('start-review')">Review</BaseButton>
      </div>
      <div v-else class="space-y-2">
        <input
          v-model="note"
          :placeholder="notePlaceholder"
          maxlength="1000"
          class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
        <div class="flex gap-2">
          <BaseButton size="sm" variant="success" @click="submit('approve')">Approve</BaseButton>
          <BaseButton size="sm" variant="danger"  @click="submit('reject')">Reject</BaseButton>
          <BaseButton size="sm" variant="ghost"   @click="emit('cancel')">Cancel</BaseButton>
        </div>
      </div>
    </footer>
  </article>
</template>
