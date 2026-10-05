// DOM simülasyonu akışı test eder; gerçek tarayıcı veya görsel doğrulama değildir.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
  constructor(tag = 'DIV') { this.tagName = tag; this.children = []; this.listeners = {}; this.style = {}; this.hidden = false; this.disabled = false; this.attrs = {}; }
  get firstChild() { return this.children[0] || null; }
  appendChild(child) { if (child.tagName === 'FRAGMENT') this.children.push(...child.children); else this.children.push(child); return child; }
  removeChild(child) { this.children.splice(this.children.indexOf(child), 1); }
  setAttribute(key, value) { this.attrs[key] = value; }
  focus() { if (rejectOptions && arguments.length) throw Error('Old focus API'); }
  addEventListener(event, fn) { this.listeners[event] = fn; }
  click() { if (!this.disabled) this.listeners.click(); }
}
let rejectOptions = true;
const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const elements = {};
for (const match of html.matchAll(/id="([^"]+)"/g)) elements[match[1]] = new Element();
elements.rangeSelect.value = '100'; elements.baseSelect.value = '2';
const document = { readyState: 'complete', getElementById: id => elements[id], createElement: tag => new Element(tag.toUpperCase()), createDocumentFragment: () => new Element('FRAGMENT'), addEventListener: () => {} };
let clock = 1000;
const window = { document, scrollTo: () => { throw Error('No scroll API'); }, console };
vm.runInNewContext(fs.readFileSync(require.resolve('../script.js'), 'utf8'), { window, Date: { now: () => (clock += 300) }, Math, Number, String });
assert.equal(elements.startBtn.disabled, false);
assert.equal(elements.loadNotice.hidden, true);
for (const base of [2, 3, 4, 5]) {
  elements.baseSelect.value = String(base);
  elements.rangeSelect.value = '63';
  elements.startBtn.click();
  assert.equal(elements.game.hidden, false);
  elements.soundBtn.click(); // AudioContext yokken de oyun devam eder.
  const number = 17;
  elements.yesBtn.click(); elements.undoBtn.click();
  assert.equal(elements.undoBtn.disabled, true);
  while (!elements.game.hidden) {
    const present = elements.numbers.children.some(cell => Number(cell.textContent) === number);
    (present ? elements.yesBtn : elements.noBtn).click();
  }
  assert.equal(elements.answer.textContent, '17');
  assert.equal(elements.errorBox.hidden, true);
  elements.reviewBtn.click();
  assert.equal(elements.game.hidden, false);
  const present = elements.numbers.children.some(cell => Number(cell.textContent) === number);
  (present ? elements.yesBtn : elements.noBtn).click();
  assert.equal(elements.answer.textContent, '17');
  elements.restartBtn.click();
  assert.equal(elements.game.hidden, false);
  elements.homeBtn.click();
  assert.equal(elements.start.hidden, false);
}
console.log('4 tabanda başlangıç, ses desteği yokluğu, eski focus API, kaydırma hatası, geri alma, sonuç ve yeniden başlatma akışları geçti.');

for (const max of [20, 30]) {
  elements.baseSelect.value = '2';
  elements.rangeSelect.value = String(max);
  elements.startBtn.click();
  assert.equal(elements.rowGame.hidden, false);
  assert.equal(elements.sequentialGame.hidden, true);
  const rows = elements.cardRows.children;
  assert.equal(rows.length, 5);
  assert.equal(elements.digitStrip.children[4].children[0].textContent, '—');
  for (let n = 1; n <= max; n++) {
    rows.forEach((row, i) => row.children[2].children[(n & (2 ** i)) ? 0 : 1].click());
    assert.equal(elements.largeResultValue.textContent, String(n));
  }
  rows.forEach(row => row.children[2].children[1].click());
  assert.ok(elements.liveTotal.textContent.includes('oluşturmuyor'));
  rows[0].children[2].children[0].click();
  assert.equal(elements.digitStrip.children[4].children[0].textContent, '1');
  assert.equal(elements.liveTerms.children[4].textContent, '1 × 2⁰ = 1');
  elements.homeBtn.click();
}
console.log('1–20 ve 1–30 satır modu: bütün sayılar, seçim değiştirme, sıfır hatası ve sağdaki 2⁰ eşlemesi geçti.');

elements.baseSelect.value = '2';
elements.rangeSelect.value = '30';
elements.startBtn.click();
assert.equal(elements.largeResult.hidden, true);
elements.cardRows.children.forEach((row, i) => row.children[2].children[(15 & (2 ** i)) ? 0 : 1].click());
assert.equal(elements.largeResult.hidden, false);
assert.equal(elements.largeResultValue.textContent, '15');
assert.equal(elements.numberReveal.className, 'number-reveal complete');
elements.cardRows.children[4].children[2].children[0].click();
assert.equal(elements.largeResult.hidden, true); // 31, aralık dışında.
elements.startBtn.click();
assert.equal(elements.largeResult.hidden, true);
assert.equal(elements.numberReveal.className, 'number-reveal');
console.log('Büyük sonuç: 15, geçersiz 31 ve yeniden başlatmada sıfırlama kontrol edildi.');

elements.rangeSelect.value = '30';
elements.startBtn.click();
const originalTile = elements.digitStrip.children[0];
const originalTerm = elements.liveTerms.children[0];
elements.cardRows.children[0].children[2].children[0].click();
assert.equal(elements.digitStrip.children[0], originalTile);
assert.equal(elements.liveTerms.children[0], originalTerm);
console.log('Animasyon için basamak ve işlem DOM elemanları cevaplar arasında korunuyor.');

for (const base of [3, 4, 5]) {
  for (const max of [20, 30]) {
    elements.baseSelect.value = String(base);
    elements.rangeSelect.value = String(max);
    elements.startBtn.click();
    assert.equal(elements.rowGame.hidden, false);
    for (let n = 1; n <= max; n++) {
      elements.cardRows.children.forEach(row => {
        const present = row.children[1].children.some(cell => +cell.textContent === n);
        row.children[2].children[present ? 0 : 1].click();
      });
      assert.equal(elements.largeResult.hidden, false);
      assert.equal(elements.largeResultValue.textContent, String(n));
      const digits = elements.digitStrip.children.map(tile => tile.children[0].textContent).join('');
      assert.equal(parseInt(digits, base), n);
    }
    elements.homeBtn.click();
  }
}
elements.baseSelect.value = '3';
elements.rangeSelect.value = '30';
elements.startBtn.click();
elements.cardRows.children[0].children[2].children[0].click();
elements.cardRows.children[1].children[2].children[0].click();
assert.equal(elements.largeResult.hidden, true);
assert.ok(elements.liveTotal.textContent.includes('farklı rakamlarına'));
console.log('3, 4, 5 tabanlarında 1–20/30 tüm sonuçlar, basamak yazımları ve çelişki kontrolü geçti.');
