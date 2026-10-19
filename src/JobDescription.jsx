import React from 'react';
import { jobTextSegments, parseJobDescription } from './jobDescription.js';

export function JobText({ children, website = false, phone = true }) {
  return jobTextSegments(children, {website, phone}).map((part, index) => part.href
    ? <a key={index} className={`job-content-link is-${part.kind}`} href={part.href} {...(part.kind === 'website' ? {target:'_blank', rel:'noopener noreferrer'} : {})}>{part.text}</a>
    : <React.Fragment key={index}>{part.text}</React.Fragment>);
}

export default function JobDescription({ text, title = '' }) {
  const {blocks} = parseJobDescription(text, {title});
  if (!blocks.length) return null;
  return <div className="job-description">
    {blocks.map((block, index) => block.type === 'facts'
      ? <section className="job-description-section" key={index} aria-label={block.title}>
          <h4>{block.title}</h4>
          <dl>{block.rows.map(({label, value}, row) => <div className={['병원주소','근무지주소','담당업무','복리후생','우대사항'].includes(label) ? 'is-wide' : undefined} key={row}>
            <dt>{label}</dt><dd className={value === '공고에 미기재' ? 'is-empty' : undefined}><JobText website={label === '홈페이지'} phone={label !== '팩스'}>{value}</JobText></dd>
          </div>)}</dl>
        </section>
      : <p className="job-description-paragraph" key={index}><JobText>{block.text}</JobText></p>)}
  </div>;
}
