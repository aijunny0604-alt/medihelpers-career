// Public, already-authorized display fields only. No network requests while typing.
export function normalizeSearchText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ko-KR')
    .replace(/\.(?!\d)|(?<!\d)\./gu, ' ')
    .replace(/[^\p{L}\p{N}.]+/gu, ' ').trim();
}
const compact = value => normalizeSearchText(value).replace(/\s+/gu, '');

export function matchesKeywords(fields, keyword) {
  const query = normalizeSearchText(keyword);
  if (!query) return true;
  const values = fields.flat().filter(value => value != null).map(normalizeSearchText);
  const joined = values.map(compact);
  if (joined.some(value => value.includes(compact(query)))) return true;
  // Concatenated known words also work in any order (내과서울 / 서울내과).
  // Only whole words actually present in the record may form such a split.
  const terms = new Set(values.flatMap(value => value.split(/\s+/u)).filter(value => value.length >= 2));
  const contains = token => joined.some(value => value.includes(token));
  const segmented = token => {
    const reachable = new Set([0]);
    for (let start = 0; start < token.length; start++) {
      if (!reachable.has(start)) continue;
      for (const term of terms) if (token.startsWith(term, start)) reachable.add(start + term.length);
    }
    return reachable.has(token.length);
  };
  return query.split(/\s+/u).every(token => contains(token) || segmented(token));
}

export function matchesJobKeywords(job, keyword) {
  return matchesKeywords([
    job.hospital, job.title, job.summary, job.location, job.region, job.dept,
    job.type, job.recruitmentType, job.schedule, job.pay, ...(Array.isArray(job.benefits) ? job.benefits : []),
  ], keyword);
}
