const assert = require('node:assert/strict');
const engine = require('../script.js');
let cases = 0;
for (const base of [2, 3, 4, 5]) {
  for (const max of [20, 30, 63, 100, 500, 1000]) {
    const cards = engine.cardsFor(max, base);
    for (let number = 1; number <= max; number++) {
      const answers = cards.map(card => Math.floor(number / card.weight) % base === card.digit);
      const result = engine.evaluate(cards, answers, max);
      assert.equal(result.valid, true);
      assert.equal(result.total, number);
      for (let index = 0; index < cards.length; index++) {
        const card = cards[index];
        const inRanges = engine.intervals(max, base, card.weight, card.digit).some(range => number >= range.from && number <= range.to);
        assert.equal(inRanges, answers[index]);
      }
      cases++;
    }
    assert.equal(engine.evaluate(cards, cards.map(() => false), max).valid, false);
  }
}
const cards = engine.cardsFor(20, 3);
const conflicting = cards.map(card => card.weight === 1);
assert.equal(engine.evaluate(cards, conflicting, 20).conflict, true);
assert.equal(engine.evaluate(cards, conflicting, 20).valid, false);
assert.equal(engine.evaluate(cards, [], 20).valid, false);
console.log(`${cases} sayı / taban / aralık kombinasyonu geçti; kart üyelikleri, sıfır, çelişki ve eksik cevap kontrol edildi.`);
