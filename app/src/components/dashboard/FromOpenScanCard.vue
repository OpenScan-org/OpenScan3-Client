<script setup lang="ts">
import entries from 'src/data/fromOpenScan.json'
import BaseNoticeCard from 'src/components/base/BaseNoticeCard.vue'
</script>

<template>
  <BaseNoticeCard
    class="q-mt-md"
    :entries="entries"
    storage-key="dashboard-from-openscan-selection"
  />
</template>
