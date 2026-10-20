import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import postcss from 'postcss';

const main=readFileSync(new URL('./main.jsx',import.meta.url),'utf8');
const css=postcss.parse(readFileSync(new URL('./styles.css',import.meta.url),'utf8'));
const hook=main.slice(main.indexOf('function useScrollMotion('),main.indexOf('// html{scroll-behavior:smooth}'));

function fixture(){
  const handlers={},frames=new Map(),writes=[];
  let sequence=0,cleanup,queries=0;
  const style={removeProperty:key=>writes.push({removed:key})};
  Object.defineProperty(style,'transform',{set:value=>writes.push(value)});
  const window={scrollY:0,innerHeight:800,
    addEventListener:(name,fn)=>{handlers[name]=fn;},
    removeEventListener:name=>{delete handlers[name];},
    requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},
    cancelAnimationFrame:id=>frames.delete(id),
  };
  const document={documentElement:{scrollHeight:2400,style:{
    setProperty:()=>{throw Error('스크롤 시 문서 전체 스타일을 변경하면 안 됩니다.');},
  }},querySelector:selector=>{queries++;return selector==='.scroll-progress'?{style}:null;}};
  vm.runInNewContext(hook+'useScrollMotion("/")',{
    window,document,motionIsReduced:()=>false,useEffect:fn=>{cleanup=fn();},
  });
  return {window,handlers,frames,writes,cleanup,get queries(){return queries;},
    tick(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());}};
}

test('스크롤 여러 건을 프레임 한 번으로 합치고 표시줄만 갱신한다',()=>{
  const f=fixture();
  f.window.scrollY=800;
  f.handlers.scroll();f.handlers.scroll();f.handlers.scroll();
  assert.equal(f.frames.size,1);
  f.tick();
  assert.deepEqual(f.writes,['scaleX(0)','scaleX(0.5)']);
  assert.equal(f.queries,2,'매 프레임 DOM을 다시 검색하지 않는다');
  f.handlers.scroll();f.tick();
  assert.equal(f.writes.length,2,'진행률이 같으면 스타일을 다시 쓰지 않는다');
});

test('화면 크기 변경·모바일 탄성 스크롤·페이지 이탈을 처리한다',()=>{
  const f=fixture();
  f.window.scrollY=-100;f.handlers.scroll();f.tick();
  assert.equal(f.writes.length,1);
  f.window.scrollY=9999;f.handlers.resize();f.tick();
  assert.equal(f.writes.at(-1),'scaleX(1)');
  f.handlers.scroll();assert.equal(f.frames.size,1);
  f.cleanup();
  assert.equal(f.frames.size,0);
  assert.deepEqual(Object.keys(f.handlers),[]);
  assert.deepEqual(f.writes.at(-1),{removed:'transform'});
});

test('모바일 페이지 전환은 고정 버튼의 기준점을 바꾸지 않는 페이드다',()=>{
  let mobileRule,frames;
  css.walkRules(rule=>{
    if(rule.selector==='html.force-motion .route-stage:not(.route-stage-static)')mobileRule=rule;
  });
  css.walkAtRules('keyframes',rule=>{if(rule.params==='route-mobile-enter')frames=rule;});
  assert.ok(mobileRule&&frames);
  assert.match(mobileRule.parent.params,/max-width:780px/);
  const values=Object.fromEntries(mobileRule.nodes.map(n=>[n.prop,n.value]));
  assert.equal(values.animation,'route-mobile-enter .28s ease-out backwards');
  assert.equal(values.transform,'none');
  frames.walkDecls(decl=>assert.equal(decl.prop,'opacity','페이지 전체의 transform/filter 애니메이션을 금지한다'));
});
