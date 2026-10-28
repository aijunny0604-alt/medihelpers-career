import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// 결제 목록의 실제 JSX 구간을 렌더링해 빈 목록에서도 조회 결과가 보이는지 확인한다.
const source=readFileSync(new URL('./MemberCenterPage.jsx',import.meta.url),'utf8');
const start=source.indexOf('{payments.length ? <section className="member-panel member-payment-list">');
const end=source.indexOf('<section className="member-panel"><div className="member-panel-head"><div><h3>전체 사용 기록',start);
assert.ok(start>=0 && end>start);
const {code}=transformSync(`function render(payments,refundMsg){return <>${source.slice(start,end)}</>}`,{loader:'jsx',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'});
const render=new Function('React','Receipt',code+';return render;')(React,()=>null);

test('결제내역 0건에서도 새로고침 실패를 실제 화면에 표시한다',()=>{
  const message='최신 결제 내역을 확인하지 못했습니다. 다시 확인해주세요.';
  const html=renderToStaticMarkup(render([],message));
  assert.match(html,/아직 결제 내역이 없습니다/);
  assert.match(html,/<p class="member-refund-msg" role="status">최신 결제 내역을 확인하지 못했습니다/);
});

test('결제내역 0건의 정상 조회 결과는 알리되 빈 오류 영역을 만들지 않는다',()=>{
  assert.match(renderToStaticMarkup(render([],'최신 환불 처리 결과를 확인했습니다.')),/최신 환불 처리 결과를 확인했습니다/);
  assert.doesNotMatch(renderToStaticMarkup(render([],'')),/member-refund-msg/);
});
