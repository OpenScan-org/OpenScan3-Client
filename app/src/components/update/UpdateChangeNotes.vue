<template>
  <span class="update-change-notes">
    <q-btn
      v-if="canShowChangelog"
      flat
      dense
      no-caps
      color="primary"
      :icon="combined ? 'library_books' : 'article'"
      :label="buttonLabel"
      @click="openDialog"
    />
    <span v-else-if="showPlaceholder" class="text-grey-6">—</span>

    <BaseDialog
      v-model="dialogOpen"
      :title="dialogTitle"
      width="min(92vw, 680px)"
    >
      <q-card-section>
        <div v-if="loading" class="row items-center q-gutter-sm q-py-md">
          <q-spinner color="primary" size="24px" />
          <span>Loading changes from GitHub…</span>
        </div>

        <template v-else-if="props.combined">
          <q-badge
            v-if="changeNotes.some((change) => change.mock)"
            color="amber-3"
            text-color="grey-10"
            label="Preview data"
            class="q-mb-sm"
          />

          <BaseBanner
            v-for="change in changeNotes.filter((item) => item.error)"
            :key="`${change.id}-error`"
            background-class="bg-amber-2"
            text-class="text-grey-9"
            class="q-mt-sm"
          >
            {{ change.label }}: {{ change.error }}
            <a
              class="update-notes__link"
              :href="change.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open changelog on GitHub
            </a>
          </BaseBanner>

          <div
            v-for="group in combinedGroupedNotes"
            :key="group.category"
            class="q-mt-md"
          >
            <div class="text-caption text-weight-bold text-primary">
              {{ group.category }}
            </div>
            <ul class="update-notes__list">
              <li v-for="(entry, index) in group.entries" :key="index">
                <span class="text-grey-6">[{{ entry.label }}]</span>
                {{ entry.text }}
              </li>
            </ul>
          </div>

          <div
            v-if="!combinedGroupedNotes.length && !changeNotes.some((change) => change.error)"
            class="text-body2 text-grey-7 q-mt-md"
          >
            No new changelog entries were found for these snapshots.
          </div>

          <div class="column items-start q-mt-md">
            <a
              v-for="change in changeNotes.filter((item) => item.compareUrl)"
              :key="`${change.id}-compare`"
              class="update-notes__link"
              :href="change.compareUrl ?? undefined"
              target="_blank"
              rel="noopener noreferrer"
            >
              View {{ change.label.toLowerCase() }} commit comparison on GitHub
            </a>
          </div>
        </template>

        <template v-else>
          <section
            v-for="change in changeNotes"
            :key="change.id"
            class="update-notes__component"
          >
            <q-badge
              v-if="change.mock"
              color="amber-3"
              text-color="grey-10"
              label="Preview data"
              class="q-mb-sm"
            />
            <BaseBanner
              v-if="change.error"
              background-class="bg-amber-2"
              text-class="text-grey-9"
              class="q-mb-md"
            >
              {{ change.error }}
              <a
                class="update-notes__link"
                :href="change.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open the {{ change.label.toLowerCase() }} changelog on GitHub
              </a>
            </BaseBanner>

            <template v-else-if="change.notes.length">
              <div
                v-for="group in groupedNotes(change)"
                :key="group.category"
                class="q-mb-md"
              >
                <div class="text-caption text-weight-bold text-primary">
                  {{ group.category }}
                </div>
                <ul class="update-notes__list">
                  <li v-for="(note, index) in group.notes" :key="index">
                    {{ note }}
                  </li>
                </ul>
              </div>
            </template>

            <div v-else class="text-body2 text-grey-7 q-mb-md">
              No new changelog entries were found for this snapshot.
            </div>

            <a
              v-if="change.compareUrl"
              class="update-notes__link"
              :href="change.compareUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              View commit comparison on GitHub
            </a>
          </section>
        </template>
      </q-card-section>

      <template #actions>
        <BaseButtonSecondary label="Close" @click="dialogOpen = false" />
      </template>
    </BaseDialog>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { OpenScanUpdatePackage } from 'src/generated/api/latest/types.gen';
import BaseBanner from 'components/base/BaseBanner.vue';
import BaseButtonSecondary from 'components/base/BaseButtonSecondary.vue';
import BaseDialog from 'components/base/BaseDialog.vue';
import {
  getNightlyUpdateChangeNotes,
  isUpdateChangeNotesMockEnabled,
  type UpdateChangeNotes as ChangeNotes,
} from 'src/services/updateChangeNotes';

const props = withDefaults(
  defineProps<{
    packages: OpenScanUpdatePackage[];
    releaseChannel: string;
    combined?: boolean;
    showPlaceholder?: boolean;
  }>(),
  {
    combined: false,
    showPlaceholder: true,
  },
);

const dialogOpen = ref(false);
const loading = ref(false);
const changeNotes = ref<ChangeNotes[]>([]);
const isSupportedPackage = (pkg: OpenScanUpdatePackage) =>
  pkg.id === 'firmware' || pkg.id === 'client';
const eligiblePackages = computed(() =>
  props.packages.filter(
    (pkg) =>
      isSupportedPackage(pkg) &&
      (isUpdateChangeNotesMockEnabled() ||
        (props.releaseChannel === 'nightly' &&
          pkg.update_available &&
          pkg.installed_version &&
          pkg.available_version)),
  ),
);
const canShowChangelog = computed(() => eligiblePackages.value.length > 0);
const buttonLabel = computed(() =>
  props.combined ? "What's changed" : 'Changelog',
);
const dialogTitle = computed(() =>
  props.combined
    ? "What's changed"
    : `${eligiblePackages.value[0] ? packageLabel(eligiblePackages.value[0]) : 'Component'} changelog`,
);
const combinedGroupedNotes = computed(() => {
  const groups = new Map<string, Array<{ label: string; text: string }>>();
  for (const change of changeNotes.value) {
    for (const note of change.notes) {
      const entries = groups.get(note.category) ?? [];
      entries.push({ label: change.label, text: note.text });
      groups.set(note.category, entries);
    }
  }
  return [...groups].map(([category, entries]) => ({ category, entries }));
});

function packageLabel(pkg: OpenScanUpdatePackage) {
  return pkg.id === 'firmware' ? 'Firmware' : 'Frontend';
}

function groupedNotes(change: ChangeNotes) {
  const groups = new Map<string, string[]>();
  for (const note of change.notes) {
    const notes = groups.get(note.category) ?? [];
    notes.push(note.text);
    groups.set(note.category, notes);
  }
  return [...groups].map(([category, notes]) => ({ category, notes }));
}

async function openDialog() {
  dialogOpen.value = true;
  changeNotes.value = [];
  loading.value = true;
  try {
    const results = await Promise.all(
      eligiblePackages.value.map((pkg) => getNightlyUpdateChangeNotes(pkg)),
    );
    changeNotes.value = results.filter((result): result is ChangeNotes => result !== null);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.update-notes__component + .update-notes__component {
  padding-top: 16px;
}

.update-notes__list {
  margin: 4px 0 0;
  padding-left: 22px;
}

.update-notes__list li + li {
  margin-top: 6px;
}

.update-notes__link {
  display: inline-block;
  color: var(--q-primary);
  text-decoration: none;
}

.update-notes__link:hover {
  text-decoration: underline;
}
</style>
