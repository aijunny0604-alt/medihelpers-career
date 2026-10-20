import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import postcss from 'postcss';

const main=readFileSync(new URL('./main.jsx',import.meta.url),'utf8');
const styles=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
const profile=main.slice(main.indexOf('function getPerformanceProfile()'),main.indexOf('function motionIsReduced()'));

test('사이트 모션은 시스템 동작 줄이기·CPU·메모리·데이터 절약·저속망의 32조합에서 유지된다',()=>{
  for(let flags=0;flags<32;flags++){
    const classes=new Set(['performance-lite']);
    const root={dataset:{},classList:{
      add:name=>classes.add(name),remove:name=>classes.delete(name),
      toggle:(name,on)=>on?classes.add(name):classes.delete(name),
    }};
    const result=vm.runInNewContext(profile+'getPerformanceProfile()',{
      document:{documentElement:root},
      window:{matchMedia:()=>({matches:Boolean(flags&1)})},
      navigator:{hardwareConcurrency:flags&2?2:16,deviceMemory:flags&4?2:16,
        connection:{saveData:Boolean(flags&8),effectiveType:flags&16?'2g':'4g'}},
    });
    assert.equal(result.reduced,false,`flags=${flags}`);
    assert.equal(classes.has('force-motion'),true);
    assert.equal(classes.has('performance-lite'),false);
    assert.equal(root.dataset.performance,'full');
  }
});

test('모든 reduced-motion CSS는 명시적 모션 모드를 제외한다',()=>{
  let count=0;
  postcss.parse(styles).walkAtRules('media',media=>{
    if(!/prefers-reduced-motion\s*:\s*reduce/.test(media.params))return;
    media.walkRules(rule=>{
      for(const selector of rule.selectors){
        count++;
        assert.ok(selector.startsWith('html:not(.force-motion)'),selector);
      }
    });
  });
  assert.ok(count>40,'축소 모션 규칙 전체를 검사해야 한다');
});

test('화면 전환을 허용해도 공고 상세의 고정 영역과 스크롤 복원은 유지한다',()=>{
  assert.match(styles,/html:not\(\.force-motion\) body \.app \.route-stage/);
  assert.match(styles,/\.route-stage\.route-stage-static\{\s*animation:none!important;\s*transform:none!important;/);
  assert.doesNotMatch(styles,/html\.force-motion \.route-stage\{[^}]*animation:[^}]*!important/);
  assert.match(main,/jumpScrollTo\(top\)/);
  assert.match(main,/pageCount < 2 \|\| paused \|\| reducedMotion \|\| !inView \|\| !documentVisible/);
});

test('모바일 도우미·가입 완료 장식을 설정과 무관하게 재생할 수 있다',()=>{
  assert.match(styles,/\.medi-angel-toggle>img\{width:54px;height:62px\}/);
  assert.match(styles,/html:not\(\.force-motion\) \.signup-welcome-page \.signup-confetti \{display:none\}/);
  const hero=readFileSync(new URL('./HeroMedia.jsx',import.meta.url),'utf8');
  assert.match(hero,/autoPlay muted loop playsInline/);
  assert.doesNotMatch(hero,/prefers-reduced-motion|saveData|performance-lite/);
});
