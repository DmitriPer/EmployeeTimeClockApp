<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  modelValue: string;
  id?: string;
  autocomplete?: string;
  inputClass?: string;
  required?: boolean;
}>();

defineEmits<{ 'update:modelValue': [value: string] }>();

const visible = ref(false);
</script>

<template>
  <div class="relative">
    <input
      :id="id"
      :value="modelValue"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      :required="required"
      :class="inputClass"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      type="button"
      tabindex="-1"
      class="absolute inset-y-0 right-2 text-xs text-gray-400 hover:text-gray-600"
      @click="visible = !visible"
    >
      {{ visible ? 'hide' : 'show' }}
    </button>
  </div>
</template>
