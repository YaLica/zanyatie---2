(function () {
  'use strict';

  const objects = {
    cat: {label: 'кошка', image: 'sluh-koshka.jpg'},
    car: {label: 'машинка', image: 'sluh-mashina.jpg'},
    leaves: {label: 'осенние листья', image: 'sluh-listya.jpg'}
  };
  const rounds = [
    [{object: 'cat', file: 'кошка.mp3', correct: true},
      {object: 'car', file: 'масына.mp3', correct: false},
      {object: 'leaves', file: 'листья фурфат.mp3', correct: false}],
    [{object: 'cat', file: 'кофка.mp3', correct: false},
      {object: 'car', file: 'машина.mp3', correct: true},
      {object: 'leaves', file: 'листья сурсат.mp3', correct: false}],
    [{object: 'cat', file: 'коска.mp3', correct: false},
      {object: 'car', file: 'мвфына.mp3', correct: false},
      {object: 'leaves', file: 'листья шуршат.mp3', correct: true}]
  ];

  function shuffled(values, random) {
    const result = values.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  class ListeningGame {
    constructor(random = Math.random) {
      this.random = random;
      this.reset();
    }
    reset() {
      this.cards = shuffled(rounds.flat(), this.random);
      this.heard = new Set();
      this.found = new Set();
    }
    get total() { return this.cards.filter(card => card.correct).length; }
    get done() { return this.found.size === this.total; }
    markHeard(file) {
      if (this.cards.some(card => card.file === file)) this.heard.add(file);
    }
    canChoose(file) {
      return !this.done && this.heard.has(file) && !this.found.has(file);
    }
    choose(file) {
      const card = this.cards.find(item => item.file === file);
      if (!card || !this.canChoose(file)) return 'blocked';
      if (card.correct) { this.found.add(file); return 'correct'; }
      return 'wrong';
    }
  }

  // Обычный скрипт работает и через file://; экспорт нужен только для проверки логики.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {ListeningGame, rounds, objects};
  }
  if (typeof document === 'undefined') return;

  const game = new ListeningGame();
  const get = id => document.getElementById(id);
  const cardsContainer = get('phonCards');
  const feedback = get('phonFeedback');
  let feedbackTimer = null;
  let pictureButtons = [];
  const winSound = get('phonWinSound');
  const loseSound = get('phonLoseSound');
  let players = [];
  let renderVersion = 0;

  function showFeedback(text, kind) {
    clearTimeout(feedbackTimer);
    feedback.textContent = text;
    feedback.className = 'phon-feedback' + (kind ? ' ' + kind : '');
  }

  function unlockChoices() {
    pictureButtons.forEach(({button, file}) => { button.disabled = !game.canChoose(file); });
  }

  function playFeedback(correct) {
    const sound = correct ? winSound : loseSound;
    pauseAll(sound);
    sound.currentTime = 0;
    const request = sound.play();
    if (request && request.catch) request.catch(() => {});
  }

  function updateProgress() {
    get('phonProgress').value = game.found.size;
    get('phonProgressText').textContent = 'Найдено: ' + game.found.size + ' из ' + game.total;
    get('phonFinish').hidden = !game.done;
    get('phonPrompt').textContent = game.done
      ? 'Все правильные варианты найдены! Можно послушать записи ещё раз.'
      : 'Слушай записи и найди три правильных варианта.';
    unlockChoices();
  }

  function makeCard(card, position) {
    const definition = objects[card.object];
    const container = document.createElement('article');
    container.className = 'phon-card';
    const choose = document.createElement('button');
    choose.type = 'button';
    choose.className = 'phon-picture';
    choose.disabled = true;
    choose.setAttribute('aria-label', 'Выбрать картинку: ' + definition.label);
    const image = document.createElement('img');
    image.src = definition.image;
    image.alt = definition.label;
    image.width = 720;
    image.height = 720;
    image.draggable = false;
    choose.append(image);

    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'phon-play';
    play.textContent = '▶ Послушать';
    play.setAttribute('aria-label', 'Послушать запись ' + (position + 1));
    const heard = document.createElement('span');
    heard.className = 'phon-heard';
    heard.textContent = 'Запись ' + (position + 1);
    const audio = document.createElement('audio');
    audio.preload = 'none';
    audio.src = '' + card.file;
    audio.hidden = true;
    audio.setAttribute('controlslist', 'nodownload');
    const error = document.createElement('p');
    error.className = 'media-error';
    error.hidden = true;
    error.textContent = 'Не удалось включить запись. Нажми «Послушать» ещё раз.';
    const version = renderVersion;

    play.addEventListener('click', () => {
      pauseAll(audio);
      error.hidden = true;
      audio.currentTime = 0;
      const request = audio.play();
      if (request && request.catch) request.catch(reason => {
        // Переключение на другую запись может отменить незавершённый play().
        if (version !== renderVersion || (reason && reason.name === 'AbortError')) return;
        error.hidden = false;
        play.textContent = '▶ Послушать';
      });
    });
    audio.addEventListener('play', () => {
      pauseAll(audio);
      play.textContent = '▶ Ещё раз';
    });
    audio.addEventListener('pause', () => { play.textContent = '▶ Послушать'; });
    audio.addEventListener('error', () => {
      error.hidden = false;
      play.textContent = '▶ Послушать';
    });
    audio.addEventListener('ended', () => {
      if (version !== renderVersion) return;
      game.markHeard(card.file);
      heard.textContent = 'Прослушано ✓';
      play.textContent = '▶ Послушать';
      unlockChoices();
    });

    choose.addEventListener('click', () => {
      const result = game.choose(card.file);
      if (result === 'blocked') return;
      pauseAll();
      cardsContainer.querySelectorAll('.is-wrong').forEach(el => el.classList.remove('is-wrong'));
      if (result === 'correct') {
        container.classList.add('is-correct');
        showFeedback('Правильно! Молодец!', 'success');
        heard.textContent = 'Правильно ✓';
        updateProgress();
        playFeedback(true);
      } else {
        container.classList.add('is-wrong');
        showFeedback('Попробуй ещё. Можно послушать снова.', 'retry');
        playFeedback(false);
        feedbackTimer = setTimeout(() => {
          container.classList.remove('is-wrong');
          showFeedback('', '');
        }, 2200);
      }
    });

    container.append(choose, play, heard, audio, error);
    pictureButtons.push({button: choose, file: card.file});
    players.push(audio);
    return container;
  }

  function render() {
    renderVersion += 1;
    players.forEach(audio => audio.pause());
    players = [];
    pictureButtons = [];
    cardsContainer.replaceChildren();
    showFeedback('', '');
    cardsContainer.hidden = false;
    get('phonPrompt').hidden = false;
    updateProgress();
    game.cards.forEach((card, position) => cardsContainer.append(makeCard(card, position)));
  }

  function restart() {
    pauseAll();
    game.reset();
    render();
  }
  get('phonRestart').addEventListener('click', restart);
  get('phonFinishRestart').addEventListener('click', restart);
  render();
})();
