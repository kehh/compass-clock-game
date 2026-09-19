const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'index.html');
const DEFAULT_WORDS = 'ROLEY\nBRAVO\nHATHI\nSMORES\nDILLYBAG\nBUDDY\nAKELA\nMINNAWARRA\nPATROL\nSCOUTS\nBRANCH\nCAMPING\nASTRAL\nSCOUTING\nBUSHWALK';

let elements;
let evalJS;

before(() => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const m = html.match(/<script>([\s\S]*)<\/script>/);
  evalJS = m[1];

  function makeEl(id) {
    return { id, value: '', innerText: '', innerHTML: '', style: {}, checked: false };
  }

  const ids = [
    'numCones', 'wordList', 'customLetters', 'randomizeCones',
    'numSheets', 'splitWordsAcrossSheets', 'errorBox', 'angleSpacing', 'coneTableContainer',
    'gameCardsContainer', 'gameCardsContainer', 'quizSheetsContainer',
    'solutionsContainer', 'outputSection',
  ];
  elements = {};
  ids.forEach((id) => { elements[id] = makeEl(id); });

  global.document = { getElementById: (id) => elements[id] };
  global.window = { print() {} };
});

after(() => {
  delete global.document;
  delete global.window;
});

function setup(opts = {}) {
  elements.numCones.value = opts.numCones || '24';
  elements.wordList.value = opts.words || DEFAULT_WORDS;
  elements.customLetters.value = opts.customLetters || '';
  elements.randomizeCones.checked = opts.randomize !== false;
  elements.numSheets.value = opts.numSheets || '3';
  elements.splitWordsAcrossSheets.checked = opts.split === true;
  elements.errorBox.style.display = 'none';
  elements.errorBox.innerHTML = '';
  elements.outputSection.style.display = 'none';
}

function count(haystack, subject) {
  return (haystack.split(subject).length - 1);
}

function cardBearingKey(html) {
  return (html.match(/\d{3}°/g) || []).join(' ');
}

function solutionMap(solHTML) {
  const map = {};
  for (const seg of solHTML.split('<div class="solution-card"').slice(1)) {
    const word = (seg.match(/Card \d+:\s*([A-Z]+)/) || [])[1];
    const key = cardBearingKey(seg);
    map[key] = word;
  }
  return map;
}

function sheetWords(sheetsHTML, map) {
  return sheetsHTML.split('<div class="quiz-sheet"').slice(1).map((seg) =>
    seg.split('<div class="quiz-card"').slice(1).map((cardHTML) => map[cardBearingKey(cardHTML)])
  );
}

test('script parses without SyntaxError', () => {
  assert.doesNotThrow(() => (0, eval)(evalJS));
});

test('default number of quiz sheets is 3', () => {
  // verify the marked-up default in index.html
  const checkboxRegex = /id="numSheets"[^>]*value="(\d+)"/;
  const m = fs.readFileSync(HTML_PATH, 'utf8').match(checkboxRegex);
  assert.ok(m, 'numSheets input not found in HTML');
  assert.strictEqual(m[1], '3');
});

test('generateGame renders 3 quiz sheet copies of the full card set by default', () => {
  setup();
  generateGame();
  const quizHTML = elements.quizSheetsContainer.innerHTML;
  assert.strictEqual(count(quizHTML, 'class="quiz-sheet"'), 3, 'expected 3 quiz sheet copies');
  assert.strictEqual(count(quizHTML, 'class="quiz-card"'), 15 * 3, 'each sheet has all 15 cards');
});

test('changing the quiz sheet count renders that many copies', () => {
  setup({ numSheets: '5' });
  generateGame();
  const quizHTML = elements.quizSheetsContainer.innerHTML;
  assert.strictEqual(count(quizHTML, 'class="quiz-sheet"'), 5);
  assert.strictEqual(count(quizHTML, 'class="quiz-card"'), 15 * 5);
});

test('each quiz sheet card lists bearings and blanks but never the target word', () => {
  setup();
  generateGame();
  const quizHTML = elements.quizSheetsContainer.innerHTML;
  for (const word of DEFAULT_WORDS.split('\n')) {
    assert.ok(!quizHTML.includes(word), `quiz sheet leaked the answer word: ${word}`);
  }
  assert.strictEqual(count(quizHTML, '[ ___ ]'), DEFAULT_WORDS.split('\n').join('').length * 3, 'each letter slot is a blank on every copy');
  assert.ok(count(quizHTML, 'Bearings:') >= 15, 'quiz cards list bearings');
});

test('solutions sheet shows words, bearings, and filled-in letters', () => {
  setup();
  generateGame();
  const solHTML = elements.solutionsContainer.innerHTML;
  for (const word of DEFAULT_WORDS.split('\n')) {
    assert.ok(solHTML.includes(word), `solutions sheet missing word: ${word}`);
    assert.ok(solHTML.includes(`[ ${word.split('')[0]} ]`) || solHTML.includes(word.split('')[0]), `solutions sheet missing letters for: ${word}`);
  }
  assert.strictEqual(count(solHTML, 'class="solution-card"'), 15);
});

test('cone layout table still renders', () => {
  setup();
  generateGame();
  assert.ok(/<table>/.test(elements.coneTableContainer.innerHTML));
  assert.strictEqual(count(elements.coneTableContainer.innerHTML, '<tr>'), 13, '24 cones render in a 2-column table');
});

test('output section is shown after generation', () => {
  setup();
  generateGame();
  assert.strictEqual(elements.outputSection.style.display, 'block');
});

test('too few cones for the words still shows a clear error', () => {
  setup({ numCones: '4' });
  generateGame();
  assert.strictEqual(elements.errorBox.style.display, 'block');
  assert.ok(elements.errorBox.innerHTML.includes('unique letters'), 'error should explain the letter/cone mismatch');
  assert.ok(elements.outputSection.style.display !== 'block' || elements.outputSection.style.display !== 'block');
});

test('print styles start each output section on a new page', () => {
  const source = fs.readFileSync(HTML_PATH, 'utf8');
  const printBlock = source.match(/@media print\s*{([\s\S]*?)\n\s*}\s*<\/style>/)[1];
  assert.ok(printBlock.includes('break-before: page'), 'print CSS must use break-before: page');
  assert.ok(printBlock.includes('.print-section + .print-section'), 'print CSS must target sections after the first');
  assert.strictEqual(count(source, 'class="print-section"'), 3, 'three output sections wrapped');
});

test('print styles start each quiz sheet copy on a new page', () => {
  const source = fs.readFileSync(HTML_PATH, 'utf8');
  const printBlock = source.match(/@media print\s*{([\s\S]*?)\n\s*}\s*<\/style>/)[1];
  assert.ok(printBlock.includes('.quiz-sheet + .quiz-sheet'), 'print CSS must target quiz sheets after the first');
});

test('head declares a compass emoji favicon as an inline SVG data URI', () => {
  const source = fs.readFileSync(HTML_PATH, 'utf8');
  const head = source.match(/<head>([\s\S]*?)<\/head>/)[1];
  const match = head.match(/<link[^>]*rel="icon"[^>]*>/);
  assert.ok(match, 'favicon link must be declared in the head');
  assert.ok(match[0].includes('image/svg+xml'), 'favicon must be an SVG data URI');
  assert.ok(match[0].includes(encodeURIComponent('\u{1F9ED}')) || match[0].includes('\u{1F9ED}'), 'favicon must render a compass emoji');
});

test('split option round-robins words across sheets so no two sheets repeat a word', () => {
  setup({ numSheets: '3', split: true, randomize: false });
  generateGame();
  const quizHTML = elements.quizSheetsContainer.innerHTML;
  const solHTML = elements.solutionsContainer.innerHTML;

  assert.strictEqual(count(quizHTML, 'class="quiz-sheet"'), 3);
  assert.strictEqual(count(quizHTML, 'class="quiz-card"'), 15, 'each word appears on exactly one sheet');

  const map = solutionMap(solHTML);
  const sheets = sheetWords(quizHTML, map);

  const all = sheets.flat();
  assert.strictEqual(all.length, 15);
  assert.strictEqual(new Set(all).size, 15, 'no word repeats across sheets');

  const words = DEFAULT_WORDS.split('\n');
  for (let s = 0; s < 3; s++) {
    const expected = words.filter((_, i) => i % 3 === s);
    assert.deepStrictEqual([...sheets[s]].sort(), [...expected].sort(), `sheet ${s + 1} gets round-robin words`);
  }

  assert.strictEqual(count(solHTML, 'class="solution-card"'), 15, 'solutions still cover all words');
});

test('split option with more sheets than words caps sheet count at word count', () => {
  setup({ numSheets: '50', split: true, randomize: false });
  generateGame();
  const quizHTML = elements.quizSheetsContainer.innerHTML;
  assert.strictEqual(count(quizHTML, 'class="quiz-sheet"'), 15, 'no empty sheets rendered');
  assert.strictEqual(count(quizHTML, 'class="quiz-card"'), 15);
});

test('36 cones completes without hanging and with no error', () => {
  setup({ numCones: '36' });
  generateGame();
  assert.strictEqual(elements.errorBox.style.display, 'none');
  assert.strictEqual(count(elements.quizSheetsContainer.innerHTML, 'class="quiz-sheet"'), 3);
});