export function formatComponentVersion(version: string | null | undefined) {
  if (!version) return '—';

  const match = version.match(/^v?(\d+\.\d+\.\d+)/i);
  if (!match) return version;

  const semanticVersion = match[1];
  const suffix = version.slice(match[0].length);
  if (!/(?:nightly|\.dev)/i.test(suffix)) return semanticVersion;

  const date = suffix.match(/(?:nightly|\.dev)[.+~\-]?(\d{8,14})/i)?.[1];
  const dateLabel = date
    ? ` from ${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
    : '';

  return `${semanticVersion} (nightly${dateLabel})`;
}
