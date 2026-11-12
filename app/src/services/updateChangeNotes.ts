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
};

type ChangeLogSource = {
  owner: string;
  repository: string;
  path: string;
  label: string;
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

export function isUpdateChangeNotesMockEnabled() {
  return (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('debugChangelog') === '1'
  );
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

function fetchChangelog(source: ChangeLogSource, sha: string) {
  const cacheKey = `${source.owner}/${source.repository}@${sha}:${source.path}`;
  let request = changelogCache.get(cacheKey);
  if (!request) {
    const url = `https://raw.githubusercontent.com/${source.owner}/${source.repository}/${sha}/${source.path}`;
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

export async function getNightlyUpdateChangeNotes(
  pkg: OpenScanUpdatePackage,
): Promise<UpdateChangeNotes | null> {
  const source = CHANGELOG_SOURCES[pkg.id];
  if (isUpdateChangeNotesMockEnabled() && source) {
    const id = pkg.id as UpdateChangeNotes['id'];
    return {
      id,
      label: source.label,
      installedVersion: '0.13.1~nightly.20261111120000.g1234abc',
      availableVersion: '0.13.2~nightly.20261112120000.g5678def',
      compareUrl: null,
      sourceUrl: `https://github.com/${source.owner}/${source.repository}/blob/develop/${source.path}`,
      notes: MOCK_NOTES[id],
      error: null,
      mock: true,
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
    const result = await loadNightlyNotes(
      source,
      pkg.installed_version,
      pkg.available_version,
    );
    return {
      id: pkg.id as UpdateChangeNotes['id'],
      label: source.label,
      installedVersion: pkg.installed_version,
      availableVersion: pkg.available_version,
      ...result,
      sourceUrl: `https://github.com/${source.owner}/${source.repository}/blob/develop/${source.path}`,
      error: null,
      mock: false,
    };
  } catch (error) {
    console.debug(`Could not load ${source.label} nightly changelog.`, error);
    return {
      id: pkg.id as UpdateChangeNotes['id'],
      label: source.label,
      installedVersion: pkg.installed_version,
      availableVersion: pkg.available_version,
      compareUrl: null,
      sourceUrl: `https://github.com/${source.owner}/${source.repository}/blob/develop/${source.path}`,
      notes: [],
      error: 'Could not load change details from GitHub.',
      mock: false,
    };
  }
}
