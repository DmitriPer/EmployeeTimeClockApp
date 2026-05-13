<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(defineProps<{
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
}>(), {
  required: false,
});

const fieldId = useId();
const errorId = computed(() => (props.error ? `${fieldId}-error` : undefined));
const hintId = computed(() => (props.hint ? `${fieldId}-hint` : undefined));
const describedBy = computed(() => [errorId.value, hintId.value].filter(Boolean).join(' ') || undefined);
</script>

<template>
  <div class="flex flex-col gap-1 text-xs text-gray-600">
    <label :for="fieldId" class="font-medium">
      {{ label }}
      <span v-if="required" class="text-red-500" aria-hidden="true">*</span>
    </label>
    <slot :id="fieldId" :aria-describedby="describedBy" />
    <p v-if="hint" :id="hintId" class="text-[11px] text-gray-500">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="text-[11px] text-red-600">{{ error }}</p>
  </div>
</template>
