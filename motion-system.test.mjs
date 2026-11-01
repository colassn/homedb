import test from 'node:test';import assert from 'node:assert/strict';import{springFrames}from'./motion-system.mjs';
test('彈簧收斂並有連續單調時間軸',()=>{const s=springFrames();assert.ok(s.duration>=120&&s.duration<=1000);assert.equal(s.frames[0].transform,'scale(0.965)');assert.equal(s.frames.at(-1).transform,'scale(1)');for(let i=1;i<s.frames.length;i++)assert.ok(s.frames[i].offset>s.frames[i-1].offset);});
test('阻尼參數影響動畫軌跡',()=>{assert.notDeepEqual(springFrames({damping:12}),springFrames({damping:35}));});
