import { normalizeWebsiteUrl } from './websiteUrl.js';

const groups = {
  '병원·기관 정보': ['병원명', '기관명', '대표자', '사원수', '직원수', '설립연도', '병상수'],
  '모집·근무조건': ['모집직종', '근무지역', '담당업무', '모집인원', '근무형태', '고용형태', '급여사항', '급여조건', '근무시간', '휴무', '복리후생'],
  '자격요건': ['자격요건', '성별', '나이', '학력', '경력', '우대사항'],
  '접수·문의': ['접수기간', '접수방법', '담당자', '연락처', '전화번호', '휴대폰', '팩스', '이메일', '홈페이지', '병원주소', '근무지주소'],
};
const groupFor = Object.fromEntries(Object.entries(groups).flatMap(([group, labels]) => labels.map(label => [label, group])));
const labels = Object.keys(groupFor).sort((a, b) => b.length - a.length).join('|');

function readRows(line) {
  // Old tables use tabs; a few copied forms put paired columns on one line.
  const paired = /^(?:병원명|기관명|성별|학력)(?:\s|[:：])/.test(line);
  const gap = paired ? '[ \t]+' : '(?:\t+| {2,})';
  const pattern = new RegExp(`(?:^|${gap})(${labels})(?=\\s|[:：]|$)[ \\t]*[:：]?[ \\t]*`, 'g');
  const matches = [...line.matchAll(pattern)];
  if (!matches.length || matches[0].index !== 0) return [];
  return matches.map((match, index) => ({
    label: match[1],
    value: line.slice(match.index + match[0].length, matches[index + 1]?.index ?? line.length).trim(),
  }));
}

export function parseJobDescription(value, { title = '' } = {}) {
  const lines = String(value ?? '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').split('\n').map(line => line.trim());
  const structured = lines.filter(line => readRows(line).length).length >= 3;
  const facts = {};
  for (const line of lines) for (const {label, value} of readRows(line)) if (value && !facts[label]) facts[label] = value;
  const blocks = [];
  let paragraph = [], table = null;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({type:'paragraph', text:paragraph.join('\n')});
    paragraph = [];
  };
  const flushTable = () => { if (table?.rows.length) blocks.push(table); table = null; };
  const website = normalizeWebsiteUrl(facts['홈페이지']);
  for (const line of lines) {
    if (!line) { flushParagraph(); continue; }
    // Only remove orphan photo captions in recognized legacy table exports.
    if (structured && (/^(?:전경(?: 사진)?|내부(?: 사진)?|외부(?: 사진)?)$/.test(line)
      || line === title.trim() || (website && normalizeWebsiteUrl(line) === website))) continue;
    const rows = structured ? readRows(line) : [];
    if (rows.length) {
      flushParagraph();
      for (const row of rows) {
        const group = groupFor[row.label];
        if (table?.title !== group) { flushTable(); table = {type:'facts', title:group, rows:[]}; }
        if (row.label === '자격요건' && !row.value) continue;
        table.rows.push({...row, value:row.value && !(row.label === '모집인원' && row.value === '명') ? row.value : '공고에 미기재'});
      }
    } else {
      flushTable();
      paragraph.push(line);
    }
  }
  flushParagraph(); flushTable();
  return {blocks, structured, facts};
}

export function jobDescriptionFacts(value) { return parseJobDescription(value).facts; }

// Return React-safe text segments; never interpret source text as HTML.
export function jobTextSegments(value, { website = false, phone = true } = {}) {
  const text = String(value ?? '');
  if (website) {
    const href = normalizeWebsiteUrl(text);
    if (href) return [{text, href, kind:'website'}];
  }
  const pattern = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+|(?:0(?:2|[1-9]\d{1,2})[- .]?\d{3,4}[- .]?\d{4}|1[568]\d{2}[- .]?\d{4})/gi;
  const segments = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    let token = match[0];
    const start = match.index;
    if (/[\w@/:]/.test(text[start - 1] || '') || /[\d]/.test(text[start + token.length] || '')) continue;
    let href = '', kind = '';
    if (/^(?:https?:\/\/|www\.)/i.test(token)) {
      token = token.replace(/[.,;:!?。，、]+$/, '');
      while (/[)\]}]$/.test(token)) {
        const end = token.at(-1), begin = {')':'(',']':'[','}':'{'}[end];
        if (token.split(end).length <= token.split(begin).length) break;
        token = token.slice(0, -1);
      }
      href = normalizeWebsiteUrl(token); kind = 'website';
    } else if (token.includes('@')) { href = 'mailto:' + token; kind = 'email'; }
    else if (phone) { href = 'tel:' + token.replace(/[^\d]/g, ''); kind = 'phone'; }
    if (!href) continue;
    if (start > cursor) segments.push({text:text.slice(cursor, start)});
    segments.push({text:token, href, kind}); cursor = start + token.length;
  }
  if (cursor < text.length) segments.push({text:text.slice(cursor)});
  return segments.length ? segments : [{text}];
}
