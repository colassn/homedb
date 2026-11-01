import test from 'node:test';import assert from 'node:assert/strict';import{weatherSymbol,activeWarnings,weatherNames,warningFiles}from'./weather-icons.mjs';import{existsSync}from'node:fs';
test('天晴使用太陽代碼，未知代碼不冒充多雲',()=>{assert.equal(weatherSymbol(50).src,'./weather-50.png');assert.equal(weatherSymbol(65).name,'雷暴');assert.equal(weatherSymbol(999),null);});
test('黃紅黑雨各有獨立圖示',()=>{for(const [code,file]of [['WRAINA','raina'],['WRAINR','rainr'],['WRAINB','rainb']])assert.equal(activeWarnings({rain:{code,actionCode:'ISSUE'}})[0].src,`./warning-${file}.gif`);});
test('取消及已過期警告不顯示生效',()=>{assert.equal(activeWarnings({a:{code:'WRAINA',actionCode:'CANCEL'},b:{code:'WTS',expireTime:'2020-01-01T00:00:00+08:00'}},Date.parse('2026-01-01')).length,0);});
test('多項警告保留；未知警告仍保留文字',()=>{const a=activeWarnings({a:{code:'WRAINA'},b:{code:'WTS'},c:{code:'NEW',name:'新警告'}});assert.equal(a.length,3);assert.equal(a[2].src,null);assert.equal(a[2].name,'新警告');});
test('所有正式圖示已封裝在本機',()=>{for(const c of Object.keys(weatherNames))assert.ok(existsSync(`weather-${c}.png`),c);for(const f of Object.values(warningFiles))assert.ok(existsSync(`warning-${f}.gif`),f);});
