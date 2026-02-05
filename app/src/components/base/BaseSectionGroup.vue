<template>
  <div class="base-section-group">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.base-section-group {
  display: flex;
  flex-direction: column;
  gap: var(--base-section-gap, 16px);
}
</style>
