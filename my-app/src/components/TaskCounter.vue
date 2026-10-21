<script setup>
defineProps({
  label: { type: String, required: true },
  count: { type: Number, required: true },
})
</script>
<template>
  <div class="tf3-stat">
    <span class="tf3-stat-label">{{ label }}</span>
    <strong>{{ count }}</strong>
  </div>
</template>
