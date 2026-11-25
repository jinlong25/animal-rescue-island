import { worksheet } from './worksheet.js';

const roundLength = 5;
const missions = [
  { title: ['Build the Bridge', '搭桥救小虎'], strategy: ['Make ten · 凑十法', '凑十法'], tile: '🪵', animal: 'tiger', name: ['Tiger cub', '小老虎'], goal: ['Build 5 bridge sections to get the tiger cub home.', '搭好 5 段桥，送小老虎回家。'], unit: ['bridge sections built', '段桥已搭好'], tint: '#f9e5c4' },
  { title: ['Pack the Snacks', '给水豚送浆果'], strategy: ['Break apart ten · 破十法', '破十法'], tile: '🫐', animal: 'capybara', name: ['Capybara', '水豚'], goal: ['Pack 5 snack bowls to help the capybara get home.', '准备 5 碗浆果，帮水豚回家。'], unit: ['snack bowls delivered', '碗浆果已送到'], tint: '#f5e1ef' },
  { title: ['Hop the Stones', '帮青蛙过河'], strategy: ['Subtract to ten · 平十法', '平十法'], tile: '🐸', animal: 'frog', name: ['Frog', '小青蛙'], goal: ['Cross 5 streams to get the frog back to its pond.', '跳过 5 条小溪，送青蛙回池塘。'], unit: ['streams crossed', '条小溪已跳过'], tint: '#dcefd7' }
];

function stored(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* Keep the current session playable with storage disabled. */ }
}

const app = document.querySelector('#app');
const homeButton = document.querySelector('#home');
const collectionButton = document.querySelector('#collection');
const languageButton = document.querySelector('#language');
let chinese = stored('ari-language', false) === true;
const storedRescues = stored('ari-rescues', [0, 0, 0]);
const rescues = missions.map((_, index) => Math.max(0, Math.floor(Number(storedRescues?.[index]) || 0)));
let screen = 'home';
let game = null;

const say = (en, zh) => chinese ? zh : en;
const label = pair => say(...pair);
function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function openScreen(next) {
  globalThis.speechSynthesis?.cancel();
  screen = next;
  render();
  app.querySelector('h1')?.focus();
}

function start(mission) {
  const bank = worksheet[mission];
  const pairs = rescues[mission] === 0 ? [bank[0], ...shuffle(bank.slice(1)).slice(0, roundLength - 1)] : shuffle(bank).slice(0, roundLength);
  game = { mission, pairs, index: 0 };
  prepareProblem();
  openScreen('game');
}

function currentProblem() {
  const [a, b] = game.pairs[game.index];
  if (game.mission === 0) {
    const gap = 10 - a;
    const left = b - gap;
    return { a, b, sign: '+', answer: a + b, steps: [
      [gap, 'How many planks fill the bridge?', '填满桥还需要几块木板？', 'Count the empty spots on the bridge.', '数一数桥上有几个空格。'],
      [left, 'The bridge is full! How many planks are left?', '桥搭好了！还剩几块木板？', 'Count the planks beside the bridge.', '数一数桥旁边的木板。'],
      [10 + left, `What is 10 + ${left}?`, `10 加 ${left} 等于几？`, `Start at 10 and count up ${left}.`, `从 10 开始，往上数 ${left} 个。`]
    ] };
  }
  const extra = a - 10;
  const answer = a - b;
  if (game.mission === 1) {
    return { a, b, sign: '−', answer, steps: [
      [b, `Give ${b} berries to the animals. How many do you take from the box of 10?`, `要送出 ${b} 颗浆果。从装了 10 颗浆果的盒子里拿出几颗？`, 'Take all the berries you need from the box of 10.', '只从装了 10 颗浆果的盒子里拿。'],
      [10 - b, 'How many berries are still in the box?', '盒子里还剩几颗浆果？', 'Count the berries still inside the box.', '数一数盒子里剩下的浆果。'],
      [answer, `What is ${10 - b} + ${extra}?`, `${10 - b} 加 ${extra} 等于几？`, 'Count the berries in the box and the ones beside it.', '把盒子里和盒子旁边的浆果加起来。']
    ] };
  }
  return { a, b, sign: '−', answer, steps: [
    [extra, 'How many hops back to reach 10?', '往回跳几步能到 10？', `Count back from ${a} to 10. Each move is one hop.`, `从 ${a} 往回数到 10，每过一格算一步。`],
    [b - extra, `The frog needs ${b} hops in all. How many hops are left?`, `小青蛙一共要跳 ${b} 步。还剩几步？`, `You already used ${extra} hops. Try ${b} − ${extra}.`, `已经跳了 ${extra} 步。算一算 ${b} 减 ${extra}。`],
    [answer, 'Which stone did the frog land on?', '小青蛙最后落在哪块石头上？', 'Look at the number under the frog.', '看看青蛙脚下的数字。']
  ] };
}

function choices(correct, max) {
  const nearby = Array.from({ length: max + 1 }, (_, n) => n)
    .filter(n => n !== correct)
    .sort((a, b) => Math.abs(a - correct) - Math.abs(b - correct));
  return shuffle([correct, ...nearby.slice(0, 2)]);
}

function resetStep() {
  const correct = game.problem.steps[game.step][0];
  const { b } = game.problem;
  let max = 20;
  if (game.step < 2) max = game.mission === 0 || game.mission === 2 ? Math.max(3, b) : 10;
  game.choices = choices(correct, max);
  game.wrong = [];
  game.feedback = '';
  game.hint = false;
}

function prepareProblem() {
  game.problem = currentProblem();
  game.step = 0;
  game.solved = false;
  resetStep();
}

function renderHome() {
  return `
    <section class="hero">
      <div class="hero-art" role="img" aria-label="${say('A tropical island with a tiger, capybara, and frog', '住着小虎、水豚和青蛙的热带小岛')}"></div>
      <div class="hero-copy">
        <h1 tabindex="-1">${say('<span>Animal</span><span>Rescue Island</span>', '<span>小动物</span><span>救援岛</span>')}</h1>
        <p>${say('Add and subtract within 20 to help the island’s animals.', '练习 20 以内加减法，帮助岛上的小动物。')}</p>
        <button class="primary" type="button" data-start="0">${say('Start rescuing', '开始救援')}</button>
      </div>
    </section>
    <section class="missions">
      <div class="section-heading"><h2>${say('Choose a mission', '选择任务')}</h2><p>${say('5 puzzles per rescue', '每次救援 5 道题')}</p></div>
      <div class="cards">${missions.map((mission, i) => `
        <button type="button" class="mission" data-start="${i}" style="--tint:${mission.tint}">
          <span class="tile" aria-hidden="true">${mission.tile}</span>
          <span><strong>${label(mission.title)}</strong><small>${label(mission.strategy)}</small></span>
        </button>`).join('')}</div>
    </section>`;
}

function cells(size, describe) {
  return Array.from({ length: size }, (_, i) => {
    const [classes, icon = ''] = describe(i);
    return `<span class="cell ${classes}" style="--i:${i}">${icon}</span>`;
  }).join('');
}

function group(title, className, content) {
  return `<div class="group"><div class="${className}" aria-hidden="true">${content}</div><span class="group-label">${title}</span></div>`;
}

function portrait(animal) {
  return `<span class="portrait ${animal}" aria-hidden="true"></span>`;
}

function renderTrail() {
  const item = missions[game.mission];
  const count = game.index + Number(game.solved);
  const location = say(`${count} of ${roundLength} ${item.unit[0]}`, `已完成 ${count} / ${roundLength} ${item.unit[1]}`);
  return `<div class="rescue-trail">
    <div class="trail-labels"><span>${count ? location : label(item.goal)}</span><span>${count === roundLength ? say('Home safe!', '到家啦！') : say('Home', '家')}</span></div>
    <div class="trail-track" role="img" aria-label="${location}" style="--progress:${count};--previous:${Math.max(0, count - 1)}">
      <div class="trail-line"></div>
      ${Array.from({ length: roundLength + 1 }, (_, i) => `<span class="trail-dot ${i <= count ? 'passed' : ''}" style="--stop:${i}" aria-hidden="true">${i === roundLength ? '🏡' : i <= count ? '✓' : ''}</span>`).join('')}
      <span class="trail-animal">${portrait(item.animal)}</span>
    </div>
  </div>`;
}

function impactMessage() {
  const { a, b, answer } = game.problem;
  const { mission, step, solved } = game;
  if (mission === 0) {
    if (solved) return say('The tiger cub crossed another section of bridge!', '小老虎走过了又一段桥！');
    if (step === 1) return say(`You added ${10 - a} planks. The bridge is ready!`, `你放上了 ${10 - a} 块木板，小桥搭好啦！`);
    if (step === 2) return say(`You saved ${a + b - 10} planks for the next section.`, `你留了 ${a + b - 10} 块木板搭下一段桥。`);
    return say(`The tiger cub is waiting. The bridge has ${a} of its 10 planks.`, `小老虎在等你。桥上已经有 ${a} 块木板，一共需要 10 块。`);
  }
  if (mission === 1) {
    if (solved) return say(`The capybara got its snack! You saved ${answer} berries for later.`, `水豚吃到点心啦！你还留了 ${answer} 颗浆果。`);
    if (step === 2) return say(`You left ${10 - b} berries in the box for another snack.`, `你在盒子里留了 ${10 - b} 颗浆果，下次还可以当点心。`);
    if (step === 1) return say(`You moved ${b} berries from the box to the capybara’s bowl.`, `你从盒子里拿了 ${b} 颗浆果，放进了水豚的碗里。`);
    return say(`The capybara is hungry for ${b} berries.`, `水豚饿了，想吃 ${b} 颗浆果。`);
  }
  if (solved) return say(`Stone ${answer} got the frog safely across the stream!`, `青蛙跳到第 ${answer} 格，安全过河啦！`);
  if (step === 2) return say(`You helped the frog hop ${b - (a - 10)} more spaces from 10.`, `你帮青蛙从 10 又跳了 ${b - (a - 10)} 步。`);
  if (step === 1) return say(`You helped the frog hop ${a - 10} spaces to reach 10.`, `你帮青蛙跳了 ${a - 10} 步，到达了 10。`);
  return say(`The frog needs ${b} hops to cross this stream.`, `小青蛙需要跳 ${b} 步才能过河。`);
}

function renderStage() {
  const { a, b, answer } = game.problem;
  const { mission, step, hint } = game;
  if (mission === 0) {
    const bridge = cells(10, i => [i < a ? 'plank' : step > 0 ? 'plank moved' : hint ? 'marker' : 'empty']);
    const loose = step > 0 ? b - (10 - a) : b;
    return `<div class="bridge-scene">
      <div class="bridge-tiger ${game.solved ? 'crossed' : ''}">${portrait('tiger')}</div>
      <div class="bridge-end" aria-hidden="true">🏡</div>
      ${group(say('Ten-slot bridge', '十格小桥'), 'frame', bridge)}
    </div>` + group(say('Loose planks', '剩下的木板'), 'loose spare-planks', cells(loose, () => ['plank']));
  }
  if (mission === 1) {
    const box = cells(10, i => i < (step > 0 ? 10 - b : 10) ? ['berry', '🫐'] : ['empty']);
    const berries = step > 0 ? cells(b, () => ['sent', '🫐']) : '';
    return `<div class="snack-stock">
      ${group(say('Box of ten', '十格浆果盒'), 'frame', box)}
      ${group(say('Extra berries', '多出的浆果'), 'loose', cells(a - 10, () => ['berry', '🫐']))}
    </div><div class="snack-scene">
      <div class="snack-animal">${portrait('capybara')}${game.solved ? '<span class="animal-heart" aria-hidden="true">♥</span>' : ''}</div>
      ${group(say('Capybara’s bowl', '水豚的碗'), 'snack-bowl', berries)}
    </div>`;
  }
  const frog = step === 0 ? a : step === 1 ? 10 : answer;
  const stones = Array.from({ length: 17 }, (_, i) => {
    const n = i + 2;
    return `<span class="stone ${n === 10 ? 'ten' : ''} ${n === frog ? 'landed' : ''} ${n > frog && n <= a ? 'visited' : ''}"><b>${n}</b></span>`;
  }).join('');
  const from = step === 1 ? a : 10;
  const hops = game.solved || step === 0 ? 0 : from - frog;
  return `<div class="frog-scene" role="img" aria-label="${say(`The frog is on stone ${frog}`, `青蛙在第 ${frog} 格`)}">
    <span class="frog-token" style="--stone:${frog - 2}" data-hops="${hops}" aria-hidden="true"><span>🐸</span></span>
    <div class="stones" aria-hidden="true">${stones}</div>
  </div>`;
}

function renderGame() {
  const { mission, index, step, solved, problem } = game;
  const { a, b, sign, answer, steps } = problem;
  const item = missions[mission];
  const prompt = solved ? impactMessage() : say(steps[step][1], steps[step][2]);
  return `
    <section class="camp">
      <div class="game-toolbar">
        <button class="secondary" type="button" data-screen="home">${say('Island map', '小岛地图')}</button>
        <span class="strategy">${label(item.strategy)}</span>
      </div>
      <div class="board" style="--tint:${item.tint}">
        <h1 tabindex="-1">${label(item.title)}</h1>
        ${renderTrail()}
        <div class="equation">${a} ${sign} ${b} = ${solved ? answer : '?'}</div>
        <div class="stage">${renderStage()}</div>
        ${solved ? '' : `<p class="impact-note">${impactMessage()}</p>`}
        <div class="prompt-row">
          <p class="prompt" tabindex="-1">${prompt}</p>
          ${!solved && 'speechSynthesis' in window ? `<button class="speak" data-speak type="button" aria-label="${say('Read aloud', '朗读题目')}">🔊</button>` : ''}
        </div>
        ${solved ? `<button type="button" class="primary next" data-next>${index === roundLength - 1 ? say('Meet your rescue', '看看救出的小动物') : say('Keep going', '继续救援')}</button>` :
          `<div class="answers">${game.choices.map(n => `<button type="button" class="answer" data-answer="${n}" ${game.wrong.includes(n) ? 'disabled' : ''}>${n}</button>`).join('')}</div>
          <div class="feedback" role="status">${game.hint ? say(steps[step][3], steps[step][4]) : game.feedback ? say('Try another number.', '换一个数字试试。') : ''}</div>
          <button type="button" class="hint" data-hint>${say('Show a hint', '看看提示')}</button>`}
      </div>
    </section>`;
}

function animateImpact() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const stage = app.querySelector('.stage');
  if (game.solved) {
    stage.classList.add('rescue-action');
    app.querySelector('.rescue-trail').classList.add('mile');
  } else {
    stage.classList.add(game.step === 1 ? 'first-action' : 'second-action');
  }

  const frog = stage.querySelector('[data-hops]');
  if (!frog?.animate || Number(frog.dataset.hops) <= 0) return;
  const hops = Number(frog.dataset.hops);
  const { a, answer } = game.problem;
  const landing = game.step === 1 ? 10 : answer;
  const position = stone => `${(stone - 1.5) / 17 * 100}%`;
  const duration = hops * 145;
  frog.animate([{ left: position(game.step === 1 ? a : 10) }, { left: position(landing) }], { duration });
  frog.firstElementChild.animate(
    [{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }],
    { duration: 145, iterations: hops }
  );
}

function renderFinish() {
  const item = missions[game.mission];
  return `<section class="camp board celebrate" style="--tint:${item.tint}">
    <div class="animal">${portrait(item.animal)}</div>
    <h1 tabindex="-1">${say('Rescue complete!', '救援成功！')}</h1>
    <p>${say(`You solved 5 puzzles and brought a ${item.name[0].toLowerCase()} home!`, `你解开了 5 道题，把${item.name[1]}带回家啦！`)}</p>
    <div class="actions">
      <button type="button" class="primary" data-start="${(game.mission + 1) % missions.length}">${say('Next mission', '下一个任务')}</button>
      <button type="button" class="secondary" data-screen="collection">${say('My rescues', '我的救援')}</button>
      <button type="button" class="secondary" data-screen="home">${say('Island map', '小岛地图')}</button>
    </div>
  </section>`;
}

function renderCollection() {
  const total = rescues.reduce((sum, n) => sum + n, 0);
  return `<section class="camp board">
    <h1 tabindex="-1">${say('My rescues', '我的救援')}</h1>
    <p class="strategy">${total ? say(`${total} ${total === 1 ? 'animal' : 'animals'} rescued`, `救出了 ${total} 只小动物`) : say('Finish a mission to bring an animal home.', '完成一个任务，把小动物带回家。')}</p>
    <div class="rescue-grid">${missions.map((item, i) => `<div class="rescue-card">${rescues[i] ? portrait(item.animal) : '<span aria-hidden="true">❔</span>'}<strong>${label(item.name)}</strong><small>${rescues[i]} ${say('rescued', '只获救')}</small></div>`).join('')}</div>
    <button type="button" class="primary" data-screen="home">${say('Island map', '小岛地图')}</button>
  </section>`;
}

function render() {
  document.documentElement.lang = chinese ? 'zh-Hans' : 'en';
  homeButton.lastElementChild.textContent = say('Animal Rescue Island', '小动物救援岛');
  collectionButton.textContent = say('My rescues', '我的救援');
  languageButton.textContent = say('中文', 'EN');
  languageButton.setAttribute('aria-label', say('Switch to Chinese', '切换到英语'));
  const pages = { home: renderHome, game: renderGame, finish: renderFinish, collection: renderCollection };
  app.innerHTML = pages[screen]();
}

homeButton.addEventListener('click', () => openScreen('home'));
collectionButton.addEventListener('click', () => openScreen('collection'));
languageButton.addEventListener('click', () => {
  chinese = !chinese;
  save('ari-language', chinese);
  globalThis.speechSynthesis?.cancel();
  render();
});

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const data = button.dataset;
  if ('start' in data) return start(Number(data.start));
  if ('screen' in data) return openScreen(data.screen);
  if (screen !== 'game') return;

  if ('speak' in data) {
    const message = new SpeechSynthesisUtterance(app.querySelector('.prompt').textContent);
    message.lang = chinese ? 'zh-CN' : 'en-US';
    message.rate = .87;
    speechSynthesis.cancel();
    speechSynthesis.speak(message);
  } else if ('answer' in data && !game.solved) {
    const number = Number(data.answer);
    if (number !== game.problem.steps[game.step][0]) {
      game.wrong.push(number);
      game.feedback = 'retry';
      button.disabled = true;
      app.querySelector('.feedback').textContent = say('Try another number.', '换一个数字试试。');
      app.querySelector('.answer:not(:disabled)')?.focus();
      return;
    }
    if (game.step === game.problem.steps.length - 1) {
      game.solved = true;
      if (game.index === roundLength - 1) {
        rescues[game.mission]++;
        save('ari-rescues', rescues);
      }
    } else {
      game.step++;
      resetStep();
    }
    render();
    animateImpact();
    app.querySelector('.prompt').focus();
  } else if ('hint' in data) {
    game.hint = true;
    app.querySelector('.feedback').textContent = say(...game.problem.steps[game.step].slice(3));
    if (game.mission === 0 && game.step === 0) {
      app.querySelectorAll('.cell.empty').forEach(cell => cell.classList.replace('empty', 'marker'));
    }
  } else if ('next' in data && game.solved) {
    if (game.index + 1 === roundLength) return openScreen('finish');
    game.index++;
    prepareProblem();
    openScreen('game');
  }
});

render();
