<script setup lang="ts">
import { computed } from 'vue';
import type { ButtonVariant, ButtonSize } from './types.js';

const props = withDefaults(defineProps<{
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
}>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
});

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60',
  success:   'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300',
  danger:    'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost:     'text-gray-400 hover:text-gray-600',
  dark:      'bg-gray-800 text-white hover:bg-gray-900 disabled:bg-gray-400',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-3 text-sm font-medium',
};

const cls = computed(() => [
  'inline-flex items-center justify-center rounded transition-colors disabled:cursor-not-allowed',
  VARIANT_CLASS[props.variant],
  SIZE_CLASS[props.size],
]);
</script>

<template>
  <button :type="type" :class="cls" :disabled="disabled || loading">
    <span v-if="loading" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
    <slot />
  </button>
</template>
