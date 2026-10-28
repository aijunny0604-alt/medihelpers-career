// Public, already-authorized display fields only. No network requests while typing.
export function normalizeSearchText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ko-KR')
    .replace(/\.(?!\d)|(?<!\d)\./gu, ' ')
    .replace(/[^\p{L}\p{N}.]+/gu, ' ').trim();
}
const compactNormalized = value => value.replace(/\s+/gu, '');
let previousKeyword;
let previousQuery;
function searchQuery(keyword) {
  const raw = String(keyword ?? '');
  if (raw !== previousKeyword) {
    const text = normalizeSearchText(raw);
    previousKeyword = raw;
    previousQuery = { text, compact:compactNormalized(text), tokens:text.split(/\s+/u) };
  }
  return previousQuery;
}

function buildSearchIndex(fields) {
  const values = fields.flat().filter(value => value != null).map(normalizeSearchText);
  return {
    joined:values.map(compactNormalized),
    terms:new Set(values.flatMap(value => value.split(/\s+/u)).filter(value => value.length >= 2)),
  };
}

function matchesIndex({ joined, terms }, query) {
  if (joined.some(value => value.includes(query.compact))) return true;
  // Concatenated known words also work in any order (내과서울 / 서울내과).
  // Only whole words actually present in the record may form such a split.
  const contains = token => joined.some(value => value.includes(token));
  const segmented = token => {
    const reachable = new Set([0]);
    for (let start = 0; start < token.length; start++) {
      if (!reachable.has(start)) continue;
      for (const term of terms) if (token.startsWith(term, start)) reachable.add(start + term.length);
    }
    return reachable.has(token.length);
  };
  return query.tokens.every(token => contains(token) || segmented(token));
}

export function matchesKeywords(fields, keyword) {
  const query = searchQuery(keyword);
  return !query.text || matchesIndex(buildSearchIndex(fields), query);
}

// 공고의 긴 본문은 키 입력마다 정규화하지 않는다. 객체가 사라지면 캐시도 회수되며,
// 같은 객체의 내용·복리후생 배열을 수정해도 현재 검색 필드와 비교해 즉시 갱신한다.
const jobIndexes = new WeakMap();
export function matchesJobKeywords(job, keyword) {
  const query = searchQuery(keyword);
  if (!query.text) return true;
  const fields = [
    job.hospital, job.title, job.summary, job.location, job.region, job.dept,
    job.type, job.recruitmentType, job.schedule, job.pay, ...(Array.isArray(job.benefits) ? job.benefits : []),
  ].flat().filter(value => value != null).map(String);
  let entry = jobIndexes.get(job);
  if (!entry || fields.length !== entry.fields.length || fields.some((value, i) => value !== entry.fields[i])) {
    entry = { fields, index:buildSearchIndex(fields) };
    jobIndexes.set(job, entry);
  }
  if (entry.query !== query.text) {
    entry.query = query.text;
    entry.matched = matchesIndex(entry.index, query);
  }
  return entry.matched;
}
