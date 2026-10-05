/* Sihirli Kartlar v4
 * Matematik motoru DOM'dan bağımsızdır. Oyun hiçbir gizli sayı girdisi istemez.
 * Eski mobil tarayıcılar için optional chaining ve logical assignment kullanılmaz.
 */
(function (root) {
  'use strict';

  // 1. Matematik: her kart, bir basamağın belirli bir rakama eşitliğini sorar.
  function weightsFor(max, base) {
    var weights = [];
    for (var weight = 1; weight <= max; weight *= base) weights.push(weight);
    return weights;
  }

  function intervals(max, base, weight, digit) {
    var ranges = [];
    for (var from = digit * weight; from <= max; from += base * weight) {
      ranges.push({ from: from, to: Math.min(from + weight - 1, max) });
    }
    return ranges;
  }

  function cardsFor(max, base) {
    var cards = [];
    weightsFor(max, base).forEach(function (weight) {
      for (var digit = 1; digit < base; digit += 1) {
        // Hiç sayı içermeyen kartlar gösterilmez.
        if (digit * weight <= max) {
          cards.push({ weight: weight, digit: digit, contribution: digit * weight });
        }
      }
    });
    return cards;
  }

  function evaluate(cards, answers, max) {
    var total = 0;
    var seen = {};
    var conflict = false;
    var terms = [];
    cards.forEach(function (card, index) {
      if (!answers[index]) return;
      if (seen[card.weight]) conflict = true;
      seen[card.weight] = true;
      total += card.contribution;
      terms.push(card);
    });
    return {
      total: total,
      terms: terms,
      valid: answers.length === cards.length && !conflict && total >= 1 && total <= max,
      conflict: conflict
    };
  }

  var engine = { weightsFor: weightsFor, intervals: intervals, cardsFor: cardsFor, evaluate: evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (!root.document) return;

  // 2. Arayüzün hazırlanması. Harici dosya defer ile, tek dosya DOM sonrasında çalışır.
  function initialize() {
    var document = root.document;
    function byId(id) { return document.getElementById(id); }
    function format(value) { return value.toLocaleString('tr-TR'); }
    function clear(element) { while (element.firstChild) element.removeChild(element.firstChild); }
    var max = 100;
    var base = 2;
    var cards = [];
    var answers = [];
    var soundOn = false;
    var audio = null;
    var screen = 'start';
    var busy = false;
    var lastAnswerTime = 0;
    var rowMode = false;
    var rowAnswers = [];
    var rowCards = [];
    var rowButtons = [];

    function focus(element) {
      try { element.focus({ preventScroll: true }); }
      catch (error) { element.focus(); }
    }

    function show(id) {
      ['start', 'game', 'result'].forEach(function (name) { byId(name).hidden = name !== id; });
      screen = id;
      // Görünüm geçişi, desteklenmeyen kaydırma seçeneklerine bağlı değildir.
      try { root.scrollTo(0, 0); } catch (error) { /* Oyun kaydırma olmadan da çalışır. */ }
    }

    // 3. Ses yalnızca kullanıcı açarsa çalar; ses hataları oyunu durdurmaz.
    function playSound(success) {
      if (!soundOn) return;
      try {
        var AudioContext = root.AudioContext || root.webkitAudioContext;
        if (!AudioContext) return;
        if (!audio) audio = new AudioContext();
        if (audio.state === 'suspended') {
          var resumed = audio.resume();
          if (resumed && resumed.catch) resumed.catch(function () {});
        }
        var notes = success ? [523.25, 659.25, 783.99] : [523.25];
        notes.forEach(function (frequency, index) {
          var oscillator = audio.createOscillator();
          var gain = audio.createGain();
          var time = audio.currentTime + index * 0.09;
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0.0001, time);
          gain.gain.exponentialRampToValueAtTime(0.07, time + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.17);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start(time);
          oscillator.stop(time + 0.18);
        });
      } catch (error) { /* AudioContext bulunmasa da oyun devam eder. */ }
    }

    function updateSettings() {
      max = Number(byId('rangeSelect').value);
      base = Number(byId('baseSelect').value);
      if ([20, 30, 63, 100, 500, 1000].indexOf(max) === -1) max = 100;
      if ([2, 3, 4, 5].indexOf(base) === -1) base = 2;
      var count = cardsFor(max, base).length;
      byId('intro').textContent = '1 ile ' + format(max) + ' arasında bir sayı düşün. Sayını yazma veya söyleme; sadece kartlarda var mı diye kontrol et.';
      byId('rangeNote').textContent = count + ' kart · Her kartta yalnızca Evet / Hayır.';
      byId('orbRange').textContent = '1–' + format(max);
      byId('orbCards').textContent = base + ' tabanı · ' + count + ' kart';
      clear(byId('orbPowers'));
      var weights = weightsFor(max, base);
      weights.forEach(function (weight, exponent) {
        var badge = document.createElement('b');
        badge.className = 'orb-power';
        badge.textContent = powerLabel(exponent);
        badge.title = powerLabel(exponent) + ' = ' + format(weight);
        var angle = -Math.PI / 2 + exponent * 2 * Math.PI / weights.length;
        badge.style.left = (50 + 47 * Math.cos(angle)) + '%';
        badge.style.top = (50 + 47 * Math.sin(angle)) + '%';
        byId('orbPowers').appendChild(badge);
      });
    }

    function shuffled(list) {
      var result = list.slice();
      for (var index = result.length - 1; index > 0; index -= 1) {
        var other = Math.floor(Math.random() * (index + 1));
        var temp = result[index];
        result[index] = result[other];
        result[other] = temp;
      }
      return result;
    }

    // 4. Kartları gösterme ve yanıtları toplama.
    function start() {
      updateSettings();
      rowMode = max <= 30;
      byId('sequentialGame').hidden = rowMode;
      byId('rowGame').hidden = !rowMode;
      byId('undoBtn').hidden = rowMode;
      cards = shuffled(cardsFor(max, base));
      answers = [];
      lastAnswerTime = 0;
      byId('mathDetails').open = false;
      show('game');
      if (rowMode) renderRows();
      else renderCard();
    }

    function renderCard() {
      var step = answers.length;
      var card = cards[step];
      var ranges = intervals(max, base, card.weight, card.digit);
      var count = ranges.reduce(function (sum, range) { return sum + range.to - range.from + 1; }, 0);
      var blockView = max > 100;
      byId('cardTitle').textContent = 'Kart ' + (step + 1);
      byId('gameRange').textContent = '1–' + format(max) + ' · ' + base + ' tabanı';
      byId('progressLabel').textContent = (step + 1) + ' / ' + cards.length + ' kart · ' + step + ' cevap';
      byId('progressBar').style.width = (step / cards.length * 100) + '%';
      byId('progressTrack').setAttribute('aria-valuenow', String(step));
      byId('progressTrack').setAttribute('aria-valuemax', String(cards.length));
      byId('cardMeta').textContent = 'Bu kartta ' + format(count) + ' sayı var. Sayıları sırayla kontrol et.';
      byId('rangeHelp').hidden = !blockView;
      var numbers = byId('numbers');
      numbers.className = blockView ? 'numbers ranges' : 'numbers';
      clear(numbers);
      var fragment = document.createDocumentFragment();
      function add(from, to) {
        var cell = document.createElement('div');
        cell.className = 'num';
        cell.textContent = from === to ? String(from) : from + '–' + to;
        fragment.appendChild(cell);
      }
      ranges.forEach(function (range) {
        if (blockView) add(range.from, range.to);
        else for (var number = range.from; number <= range.to; number += 1) add(number, number);
      });
      numbers.appendChild(fragment);
      numbers.scrollTop = 0;
      byId('undoBtn').disabled = step === 0;
      focus(byId('cardTitle'));
    }

    function answer(yes) {
      var now = Date.now();
      // Çift dokunma veya aynı anda iki düğmeye basma sonraki kartı cevaplamaz.
      if (rowMode || screen !== 'game' || busy || (lastAnswerTime && now - lastAnswerTime < 250)) return;
      busy = true;
      lastAnswerTime = now;
      try {
        answers.push(yes);
        if (answers.length === cards.length) reveal();
        else renderCard();
        playSound(false);
      } finally { busy = false; }
    }

    function undo() {
      if (!answers.length) return;
      answers.pop();
      lastAnswerTime = 0;
      show('game');
      renderCard();
    }

    // 5. Sonuç ve yalnızca oyun sonunda açılan matematik açıklaması.
    function reveal() {
      var result = evaluate(cards, answers, max);
      show('result');
      byId('answer').textContent = result.valid ? format(result.total) : '?';
      byId('resultLead').textContent = result.valid ? 'Aklından tuttuğun sayı…' : 'Cevaplarını kontrol edelim.';
      byId('resultText').textContent = result.valid ? 'Bildim!' : 'Cevaplar birbiriyle uyuşmuyor.';
      byId('resultSub').textContent = result.valid ? 'Sayını hiç yazmadın. Kartlar yeterli oldu.' : 'Önceki kartlara dönerek cevaplarını düzeltebilir veya yeniden oynayabilirsin.';
      byId('errorBox').hidden = result.valid;
      byId('errorBox').textContent = result.conflict
        ? 'Aynı basamağın farklı rakamlarına ait kartlara Evet denmiş. Tek bir sayı bu cevapların hepsine uyamaz.'
        : 'Cevapların seçilen 1–' + format(max) + ' aralığında bir sayı oluşturmuyor.';
      byId('mathDetails').hidden = !result.valid;
      var terms = result.terms.slice().sort(function (a, b) { return a.weight - b.weight; });
      byId('mathExplanation').textContent = base === 2
        ? 'Her Evet, ikili yazımındaki bir basamağın 1 olduğunu gösterir. Evet dediğin kartların katkılarını toplarız.'
        : base + ' tabanında bir basamak 0 ile ' + (base - 1) + ' arasında olabilir. Her kart, bir basamağın belirli bir rakama eşit olup olmadığını sorar. Evet dediğin kartın katkısı rakam × basamak değeridir; o basamağın bütün kartlarına Hayır demek rakamın 0 olduğunu söyler.';
      byId('resultSum').textContent = terms.map(function (card) { return card.digit + ' × ' + format(card.weight); }).join(' + ') + ' = ' + format(result.total);
      byId('resultDigits').textContent = base + ' tabanındaki yazımı: ' + result.total.toString(base) + ' · ' + weightsFor(max, base).length + ' basamak.';
      clear(byId('yesWeights'));
      terms.forEach(function (card) {
        var pill = document.createElement('span');
        pill.className = 'pill';
        pill.textContent = 'Kart katkısı: ' + format(card.contribution);
        byId('yesWeights').appendChild(pill);
      });
      clear(byId('comparisonBody'));
      [2, 3, 4, 5].forEach(function (radix) {
        var row = document.createElement('tr');
        [radix, weightsFor(max, radix).length, cardsFor(max, radix).length].forEach(function (value) {
          var cell = document.createElement('td');
          cell.textContent = String(value);
          row.appendChild(cell);
        });
        byId('comparisonBody').appendChild(row);
      });
      focus(byId('resultText'));
      if (result.valid) playSound(true);
    }

    // İkili tabanda küçük aralıklar: tüm kartlar ve canlı matematik aynı ekranda.
    function powerLabel(exponent) {
      return String(base) + String(exponent).split('').map(function (digit) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)]; }).join('');
    }

    function renderRows() {
      var weights = weightsFor(max, base);
      rowCards = cardsFor(max, base);
      rowAnswers = rowCards.map(function () { return null; });
      rowButtons = [];
      clear(byId('digitStrip'));
      clear(byId('liveTerms'));
      clear(byId('cardRows'));
      byId('baseHelp').open = false;
      byId('baseHelpText').textContent = base === 2
        ? 'İkili tabanda her basamak 0 veya 1 olur. Basamak değerleri 1, 2, 4, 8, 16 şeklindedir. Bir karta Evet demek ilgili basamağın 1 olduğunu söyler.'
        : base + ' tabanında her basamak 0 ile ' + (base - 1) + ' arasında bir rakam alır. Basamak değerleri ' + weights.join(', ') + ' şeklindedir. Bu yüzden her basamak için farklı rakamları soran kartlar vardır. Örneğin 2 × ' + powerLabel(0) + ' kartına Evet demek, birler basamağının 2 olduğunu söyler; bu kartın katkısı 2’dir.';
      byId('baseHelpExample').textContent = {
        2: 'Örnek: 15 = 0 × 2⁴ + 1 × 2³ + 1 × 2² + 1 × 2¹ + 1 × 2⁰ → 01111₂',
        3: 'Örnek: 15 = 1 × 3² + 2 × 3¹ + 0 × 3⁰ = 9 + 6 + 0 → 120₃',
        4: 'Örnek: 15 = 0 × 4² + 3 × 4¹ + 3 × 4⁰ = 0 + 12 + 3 → 033₄',
        5: 'Örnek: 15 = 0 × 5² + 3 × 5¹ + 0 × 5⁰ = 0 + 15 + 0 → 030₅'
      }[base];
      byId('rowTitle').textContent = 'Aklında 1 ile ' + format(max) + ' arasında bir sayı tut';
      byId('rowRange').textContent = '1–' + max + ' · ' + base + ' tabanı · ' + rowCards.length + ' kart';
      rowCards.forEach(function (card, index) {
        var weight = card.weight;
        var exponent = weights.indexOf(weight);
        var cardLabel = (base === 2 ? '' : card.digit + ' × ') + powerLabel(exponent);
        var row = document.createElement('section');
        row.className = 'card-row';
        row.setAttribute('aria-label', cardLabel + ' değerli kart');
        var title = document.createElement('h3');
        title.textContent = cardLabel + ' = ' + card.contribution;
        row.appendChild(title);
        var list = document.createElement('div');
        list.className = 'row-numbers';
        intervals(max, base, weight, card.digit).forEach(function (range) {
          for (var n = range.from; n <= range.to; n += 1) {
            var cell = document.createElement('span');
            cell.textContent = String(n);
            list.appendChild(cell);
          }
        });
        row.appendChild(list);
        var controls = document.createElement('div');
        controls.className = 'row-choices';
        rowButtons[index] = [];
        [true, false].forEach(function (value) {
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn ghost';
          button.textContent = value ? 'Evet' : 'Hayır';
          button.setAttribute('aria-pressed', 'false');
          button.setAttribute('aria-label', cardLabel + ' kartında sayım ' + (value ? 'var' : 'yok'));
          button.addEventListener('click', function () {
            rowAnswers[index] = value;
            rowButtons[index].forEach(function (entry) {
              var selected = entry.value === value;
              entry.button.setAttribute('aria-pressed', String(selected));
              entry.button.className = selected ? 'btn ' + (entry.value ? 'yes' : 'no') : 'btn ghost';
            });
            updateLiveMath();
            playSound(false);
          });
          rowButtons[index].push({ button: button, value: value });
          controls.appendChild(button);
        });
        row.appendChild(controls);
        byId('cardRows').appendChild(row);
      });
      updateLiveMath();
      focus(byId('rowTitle'));
    }

    function updateLiveMath() {
      var weights = weightsFor(max, base);
      var total = 0;
      var completed = 0;
      var conflict = false;
      rowCards.forEach(function (card, position) {
        if (rowAnswers[position] !== null) completed += 1;
        if (rowAnswers[position] === true) total += card.contribution;
      });
      for (var index = weights.length - 1; index >= 0; index -= 1) {
        var answered = true;
        var yesDigits = [];
        rowCards.forEach(function (card, position) {
          if (card.weight !== weights[index]) return;
          if (rowAnswers[position] === null) answered = false;
          if (rowAnswers[position] === true) yesDigits.push(card.digit);
        });
        var digit = answered ? (yesDigits.length ? yesDigits[0] : 0) : '—';
        if (yesDigits.length > 1) { conflict = true; digit = '!'; answered = false; }
        var position = weights.length - 1 - index;
        var tile = byId('digitStrip').children[position];
        var term = byId('liveTerms').children[position];
        if (!tile) {
          tile = document.createElement('div');
          tile.appendChild(document.createElement('strong'));
          var label = document.createElement('span');
          label.textContent = powerLabel(index);
          tile.appendChild(label);
          byId('digitStrip').appendChild(tile);
          term = document.createElement('span');
          term.className = 'live-term';
          byId('liveTerms').appendChild(term);
        }
        tile.className = 'digit-tile' + (answered ? ' answered' : '');
        tile.children[0].textContent = String(digit);
        term.textContent = digit + ' × ' + powerLabel(index) + (answered ? ' = ' + (Number(digit) * weights[index]) : ' = ?');
      }
      var validResult = completed === rowCards.length && !conflict && total >= 1 && total <= max;
      byId('numberReveal').className = validResult ? 'number-reveal complete' : 'number-reveal';
      byId('largeResult').hidden = !validResult;
      byId('largeResultValue').textContent = validResult ? String(total) : '';
      if (conflict) {
        byId('liveTotal').textContent = 'Aynı basamağın farklı rakamlarına Evet dedin. Bu kartların cevaplarını kontrol et.';
      } else if (completed < rowCards.length) {
        byId('liveTotal').textContent = completed + ' / ' + rowCards.length + ' cevap · Şu ana kadarki toplam: ' + total;
      } else if (total < 1 || total > max) {
        byId('liveTotal').textContent = 'Toplam ' + total + '. Cevapların 1–' + max + ' aralığında bir sayı oluşturmuyor; seçimlerini kontrol et.';
      } else {
        byId('liveTotal').textContent = completed + ' / ' + rowCards.length + ' cevap tamamlandı.';
      }
    }

    function home() { show('start'); focus(byId('startBtn')); }
    function bind(id, event, callback) {
      byId(id).addEventListener(event, function () {
        try { callback(); }
        catch (error) {
          byId('loadNotice').hidden = false;
          byId('loadNotice').textContent = 'Oyun bir hata ile karşılaştı. Başa dönüp tekrar deneyebilir veya dosyayı Safari / Chrome ile açabilirsin.';
          if (root.console) root.console.error(error);
        }
      });
    }
    bind('rangeSelect', 'change', updateSettings);
    bind('baseSelect', 'change', updateSettings);
    bind('startBtn', 'click', start);
    bind('restartBtn', 'click', start);
    bind('yesBtn', 'click', function () { answer(true); });
    bind('noBtn', 'click', function () { answer(false); });
    bind('undoBtn', 'click', undo);
    bind('reviewBtn', 'click', undo);
    bind('homeBtn', 'click', home);
    bind('resultHomeBtn', 'click', home);
    bind('soundBtn', 'click', function () {
      soundOn = !soundOn;
      byId('soundBtn').textContent = 'Ses: ' + (soundOn ? 'açık' : 'kapalı');
      byId('soundBtn').setAttribute('aria-pressed', String(soundOn));
      if (soundOn) playSound(false);
    });
    document.addEventListener('keydown', function (event) {
      var tag = event.target && event.target.tagName;
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|SELECT|TEXTAREA|BUTTON|A|SUMMARY)$/.test(tag)) return;
      var key = String(event.key).toLowerCase();
      if (!rowMode && screen === 'game' && (key === 'e' || key === 'h')) {
        event.preventDefault();
        answer(key === 'e');
      }
    });
    function expandPortal() {
      if (byId('welcomePortal').className.indexOf('expanded') !== -1) return;
      byId('welcomePortal').className = 'welcome-portal expanded';
      byId('activityMenu').hidden = false;
      byId('welcomeBtn').setAttribute('aria-expanded', 'true');
      byId('welcomeHint').textContent = 'Matematikle keşfet';
      focus(byId('openGameBtn'));
    }
    bind('welcomeBtn', 'click', expandPortal);
    byId('welcomePortal').addEventListener('click', expandPortal);
    bind('openGameBtn', 'click', function () {
      byId('welcomePortal').hidden = true;
      byId('gameApp').hidden = false;
      home();
    });
    bind('portalHomeBtn', 'click', function () {
      byId('gameApp').hidden = true;
      byId('welcomePortal').hidden = false;
      focus(byId('openGameBtn'));
    });
    updateSettings();
    byId('startBtn').disabled = false;
    byId('loadNotice').hidden = true;
  }

  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})(typeof window !== 'undefined' ? window : globalThis);
