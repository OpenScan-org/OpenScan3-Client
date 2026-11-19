import type { OpenScanUpdatePackage } from 'src/generated/api/latest/types.gen';

type ChangeNote = {
  category: string;
  text: string;
};

export type UpdateChangeNotes = {
  id: 'firmware' | 'client';
  label: string;
  installedVersion: string;
  availableVersion: string;
  compareUrl: string | null;
  sourceUrl: string;
  notes: ChangeNote[];
  error: string | null;
  mock: boolean;
  mockMode: 'single' | 'multi' | 'offline' | null;
};

type ChangeLogSource = {
  owner: string;
  repository: string;
  path: string;
  label: string;
};

type VersionedChangeLog = {
  version: string;
  notes: ChangeNote[];
};

const CHANGELOG_SOURCES: Partial<
  Record<OpenScanUpdatePackage['id'], ChangeLogSource>
> = {
  firmware: {
    owner: 'OpenScan-org',
    repository: 'OpenScan3',
    path: 'CHANGELOG',
    label: 'Firmware',
  },
  client: {
    owner: 'OpenScan-org',
    repository: 'OpenScan3-Client',
    path: 'app/CHANGELOG.md',
    label: 'Frontend',
  },
};

const shaCache = new Map<string, Promise<string>>();
const changelogCache = new Map<string, Promise<string>>();

export function invalidateStableChangeNotesCache() {
  for (const source of Object.values(CHANGELOG_SOURCES)) {
    if (!source) continue;
    changelogCache.delete(
      `${source.owner}/${source.repository}@main:${source.path}`,
    );
  }
}

export function isUpdateChangeNotesMockEnabled() {
  return getUpdateChangeNotesMockMode() !== null;
}

export function getUpdateChangeNotesMockMode(): 'single' | 'multi' | 'offline' | null {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get('debugChangelog');
  if (value === '1') return 'single';
  if (value === 'multi') return 'multi';
  if (value === 'offline') return 'offline';
  return null;
}

const MOCK_NOTES: Record<'firmware' | 'client', ChangeNote[]> = {
  firmware: [
    {
      category: 'Added',
      text: 'Added scanner-specific autofocus tuning for the OpenScan Mini.',
    },
    {
      category: 'Changed',
      text: 'Camera controls are now applied consistently to preview and still captures.',
    },
    {
      category: 'Fixed',
      text: 'Fixed camera restarts leaving a preview stream active.',
    },
  ],
  client: [
    {
      category: 'Added',
      text: 'Added an option to schedule focus stacking automatically after a scan.',
    },
    {
      category: 'Changed',
      text: 'Interrupted tasks can now be resumed from the task drawer.',
    },
    {
      category: 'Fixed',
      text: 'Focus stacking now allows setting a focus value of 0.',
    },
  ],
};

const MULTI_VERSION_MOCK_NOTES: Record<'firmware' | 'client', ChangeNote[]> = {
  firmware: [
    {
      category: 'Added',
      text: 'Added support for the IMX519 camera and Raspberry Pi 5.',
    },
    {
      category: 'Added',
      text: 'Added scanner-specific autofocus tuning for the OpenScan Mini.',
    },
    {
      category: 'Changed',
      text: 'Improved camera stability under high system load.',
    },
    {
      category: 'Changed',
      text: 'Camera controls are now applied consistently to preview and still captures.',
    },
    {
      category: 'Fixed',
      text: 'Fixed still captures ignoring updated exposure settings.',
    },
  ],
  client: [
    {
      category: 'Added',
      text: 'Added a light toggle to the settings page.',
    },
    {
      category: 'Added',
      text: 'Added the integrated software update page.',
    },
    {
      category: 'Added',
      text: 'Added a camera orientation dialog and automatic focus stacking.',
    },
    {
      category: 'Changed',
      text: 'Interrupted scans and focus-stacking tasks can be resumed.',
    },
    {
      category: 'Fixed',
      text: 'Focus stacking now allows setting a focus value of 0.',
    },
  ],
};

function nightlyCommit(version: string | null) {
  if (!version) return null;
  return version.match(/(?:^|[.+])g([0-9a-f]{7,40})$/i)?.[1] ?? null;
}

async function fetchText(url: string, cache: RequestCache = 'default') {
  const response = await fetch(url, { cache });
  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} for ${url}`);
  }
  return response.text();
}

function resolveCommit(source: ChangeLogSource, shortSha: string) {
  const cacheKey = `${source.owner}/${source.repository}@${shortSha}`;
  let request = shaCache.get(cacheKey);
  if (!request) {
    const url = `https://api.github.com/repos/${source.owner}/${source.repository}/commits/${shortSha}`;
    request = fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Could not resolve GitHub commit (${response.status}).`);
        }
        const data = (await response.json()) as { sha?: unknown };
        if (typeof data.sha !== 'string' || !/^[0-9a-f]{40}$/i.test(data.sha)) {
          throw new Error('GitHub returned an invalid commit identifier.');
        }
        return data.sha;
      })
      .catch((error: unknown) => {
        shaCache.delete(cacheKey);
        throw error;
      });
    shaCache.set(cacheKey, request);
  }
  return request;
}

function fetchChangelog(source: ChangeLogSource, ref: string) {
  const cacheKey = `${source.owner}/${source.repository}@${ref}:${source.path}`;
  let request = changelogCache.get(cacheKey);
  if (!request) {
    const url = `https://raw.githubusercontent.com/${source.owner}/${source.repository}/${ref}/${source.path}`;
    request = fetchText(url).catch((error: unknown) => {
      changelogCache.delete(cacheKey);
      throw error;
    });
    changelogCache.set(cacheKey, request);
  }
  return request;
}

function parseNotes(markdown: string): ChangeNote[] {
  const notes: ChangeNote[] = [];
  let category = '';
  let current: string[] = [];

  const saveCurrent = () => {
    const text = current.join(' ').replace(/\s+/g, ' ').trim();
    if (text) notes.push({ category, text });
    current = [];
  };

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^#{2,6}\s+(.+?)\s*#*$/);
    if (heading) {
      saveCurrent();
      category = /^#{3,}\s/.test(line) ? heading[1] : '';
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bullet) {
      saveCurrent();
      if (category) current.push(bullet[1].trim());
      continue;
    }

    if (current.length && line.trim()) current.push(line.trim());
  }
  saveCurrent();
  return notes;
}

function normalizeNote(text: string) {
  return text.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function addedNotes(baseMarkdown: string, targetMarkdown: string) {
  const existing = new Set(
    parseNotes(baseMarkdown).map((note) => normalizeNote(note.text)),
  );
  return parseNotes(targetMarkdown).filter(
    (note) => !existing.has(normalizeNote(note.text)),
  );
}

function comparableVersion(value: string) {
  const version = value.match(/(?:^|[^\d])v?(\d+)\.(\d+)\.(\d+)(?=$|[+~\-])/i);
  if (!version) return null;
  return {
    normalized: `${Number(version[1])}.${Number(version[2])}.${Number(version[3])}`,
    parts: [Number(version[1]), Number(version[2]), Number(version[3])] as const,
  };
}

function compareVersions(left: string, right: string) {
  const leftVersion = comparableVersion(left);
  const rightVersion = comparableVersion(right);
  if (!leftVersion || !rightVersion) return null;
  for (let index = 0; index < leftVersion.parts.length; index += 1) {
    if (leftVersion.parts[index] !== rightVersion.parts[index]) {
      return leftVersion.parts[index] < rightVersion.parts[index] ? -1 : 1;
    }
  }
  return 0;
}

function parseVersionedChangelog(markdown: string): VersionedChangeLog[] {
  const sections: VersionedChangeLog[] = [];
  let section: VersionedChangeLog | null = null;
  let category = '';
  let current: string[] = [];

  const saveCurrent = () => {
    const text = current.join(' ').replace(/\s+/g, ' ').trim();
    if (text && section) section.notes.push({ category, text });
    current = [];
  };

  for (const line of markdown.split(/\r?\n/)) {
    const versionHeading = line.match(/^##\s+v?(\d+\.\d+\.\d+)(?:\s|$)/i);
    if (/^##\s+/.test(line)) {
      saveCurrent();
      const version = versionHeading
        ? comparableVersion(versionHeading[1])?.normalized
        : null;
      section = version ? { version, notes: [] } : null;
      if (section) sections.push(section);
      category = '';
      continue;
    }

    if (!section) continue;

    const heading = line.match(/^#{3,6}\s+(.+?)\s*#*$/);
    if (heading) {
      saveCurrent();
      category = heading[1];
      continue;
    }

    const bullet = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bullet) {
      if (bullet[1] && current.length) {
        current.push(bullet[2].trim());
      } else {
        saveCurrent();
        if (category) current.push(bullet[2].trim());
      }
      continue;
    }

    if (current.length && line.trim()) current.push(line.trim());
  }
  saveCurrent();
  return sections;
}

function stableNotes(
  markdown: string,
  installedVersion: string,
  availableVersion: string,
) {
  const installed = comparableVersion(installedVersion);
  const available = comparableVersion(availableVersion);
  if (!installed || !available) {
    throw new Error('Stable package versions are not in a recognizable version format.');
  }

  const sections = parseVersionedChangelog(markdown);
  if (!sections.some((section) => section.version === available.normalized)) {
    throw new Error(`No changelog section found for version ${available.normalized}.`);
  }

  return sections
    .filter((section) => {
      const aboveInstalled = compareVersions(section.version, installed.normalized);
      const atOrBelowAvailable = compareVersions(section.version, available.normalized);
      return aboveInstalled === 1 && (atOrBelowAvailable === -1 || atOrBelowAvailable === 0);
    })
    .sort((left, right) => compareVersions(left.version, right.version) ?? 0)
    .flatMap((section) => section.notes);
}

function githubCompareUrl(
  source: ChangeLogSource,
  baseSha: string,
  targetSha: string,
) {
  return `https://github.com/${source.owner}/${source.repository}/compare/${baseSha}...${targetSha}`;
}

async function loadNightlyNotes(
  source: ChangeLogSource,
  installedVersion: string,
  availableVersion: string,
): Promise<Pick<UpdateChangeNotes, 'compareUrl' | 'notes'>> {
  const basePrefix = nightlyCommit(installedVersion);
  const targetPrefix = nightlyCommit(availableVersion);
  if (!basePrefix || !targetPrefix) {
    throw new Error('The nightly version does not contain a recognizable Git commit.');
  }

  const [baseSha, targetSha] = await Promise.all([
    resolveCommit(source, basePrefix),
    resolveCommit(source, targetPrefix),
  ]);
  if (baseSha === targetSha) {
    return { compareUrl: githubCompareUrl(source, baseSha, targetSha), notes: [] };
  }

  const [baseMarkdown, targetMarkdown] = await Promise.all([
    fetchChangelog(source, baseSha),
    fetchChangelog(source, targetSha),
  ]);
  return {
    compareUrl: githubCompareUrl(source, baseSha, targetSha),
    notes: addedNotes(baseMarkdown, targetMarkdown),
  };
}

async function loadStableNotes(
  source: ChangeLogSource,
  installedVersion: string,
  availableVersion: string,
): Promise<Pick<UpdateChangeNotes, 'compareUrl' | 'notes'>> {
  const markdown = await fetchChangelog(source, 'main');
  return {
    compareUrl: null,
    notes: stableNotes(markdown, installedVersion, availableVersion),
  };
}

export async function getUpdateChangeNotes(
  pkg: OpenScanUpdatePackage,
  releaseChannel: string,
): Promise<UpdateChangeNotes | null> {
  const source = CHANGELOG_SOURCES[pkg.id];
  const mockMode = getUpdateChangeNotesMockMode();
  if (mockMode && source) {
    const id = pkg.id as UpdateChangeNotes['id'];
    return {
      id,
      label: source.label,
      installedVersion:
        mockMode !== 'single'
          ? id === 'firmware'
            ? '0.11.0'
            : '0.6.0'
          : '0.13.1~nightly.20261111120000.g1234abc',
      availableVersion:
        mockMode !== 'single'
          ? id === 'firmware'
            ? '0.13.2'
            : '0.8.0'
          : '0.13.2~nightly.20261112120000.g5678def',
      compareUrl: null,
      sourceUrl: `https://github.com/${source.owner}/${source.repository}/blob/${mockMode === 'single' ? 'develop' : 'main'}/${source.path}`,
      notes:
        mockMode === 'offline'
          ? []
          : mockMode === 'multi'
            ? MULTI_VERSION_MOCK_NOTES[id]
            : MOCK_NOTES[id],
      error:
        mockMode === 'offline'
          ? 'GitHub could not be reached. Check your connection and try again.'
          : null,
      mock: true,
      mockMode,
    };
  }
  if (
    !source ||
    !pkg.update_available ||
    !pkg.installed_version ||
    !pkg.available_version
  ) {
    return null;
  }

  try {
    const result =
      releaseChannel === 'stable'
        ? await loadStableNotes(source, pkg.installed_version, pkg.available_version)
        : releaseChannel === 'nightly'
          ? await loadNightlyNotes(source, pkg.installed_version, pkg.available_version)
          : null;
    if (!result) return null;
    return {
      id: pkg.id as UpdateChangeNotes['id'],
      label: source.label,
      installedVersion: pkg.installed_version,
      availableVersion: pkg.available_version,
      ...result,
      sourceUrl: `https://github.com/${source.owner}/${source.repository}/blob/${releaseChannel === 'stable' ? 'main' : 'develop'}/${source.path}`,
      error: null,
      mock: false,
      mockMode: null,
    };
  } catch (error) {
    console.debug(`Could not load ${source.label} ${releaseChannel} changelog.`, error);
    return {
      id: pkg.id as UpdateChangeNotes['id'],
      label: source.label,
      installedVersion: pkg.installed_version,
      availableVersion: pkg.available_version,
      compareUrl: null,
      sourceUrl: `https://github.com/${source.owner}/${source.repository}/blob/${releaseChannel === 'stable' ? 'main' : 'develop'}/${source.path}`,
      notes: [],
      error:
        releaseChannel === 'stable'
          ? 'Could not find matching stable changelog entries on GitHub.'
          : 'Could not load change details from GitHub.',
      mock: false,
      mockMode: null,
    };
  }
}
