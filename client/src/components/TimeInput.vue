<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: string;
  required?: boolean;
  disabled?: boolean;
  inputClass?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const isValid = computed(() => {
  if (!props.modelValue) return true;
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(props.modelValue);
});

function onInput(e: Event): void {
  const el = e.target as HTMLInputElement;
  const digits = el.value.replace(/\D/g, '').slice(0, 4);
  const formatted = digits.length > 2 ? digits.slice(0, 2) + ':' + digits.slice(2) : digits;
  el.value = formatted;
  emit('update:modelValue', formatted);
}

function onKeydown(e: KeyboardEvent): void {
  const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (allowed.includes(e.key)) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
}
</script>

<template>
  <input
    :value="modelValue"
    type="text"
    placeholder="HH:MM"
    maxlength="5"
    :required="required"
    :disabled="disabled"
    @input="onInput"
    @keydown="onKeydown"
    :class="[
      inputClass ?? 'rounded border px-2 py-1.5 text-sm',
      !isValid ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
      disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : '',
    ]"
  />
</template>
