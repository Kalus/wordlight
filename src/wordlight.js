/**
 * Turn a text wall into a pointer-lit field of words.
 *
 * Required markup: a wall element containing text and buttons with
 * `data-definition`, plus an empty projection element.
 */
export function createWordlight({ wall, projection, light, back, root = document.body }) {
  const resolve = value => typeof value === 'string' ? document.querySelector(value) : value;
  const elements = {
    wall: resolve(wall),
    projection: resolve(projection),
    light: resolve(light),
    back: resolve(back)
  };

  if (!elements.wall || !elements.projection || !elements.light) {
    throw new Error('Wordlight needs wall, projection, and light elements.');
  }

  root.classList.add('wordlight');
  elements.projection.setAttribute('aria-live', 'polite');
  elements.projection.setAttribute('aria-atomic', 'true');
  elements.back?.setAttribute('tabindex', '-1');

  const textNodes = [];
  const walker = document.createTreeWalker(elements.wall, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest('[data-definition]')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(node => wrapTextNode(node));

  const nouns = [...elements.wall.querySelectorAll('[data-definition]')];
  nouns.forEach(noun => noun.classList.add('wordlight__word', 'wordlight__noun'));

  const allWords = [...elements.wall.querySelectorAll('.wordlight__word')];
  allWords.forEach((word, index) => {
    const depth = 6 + ((index * 17) % 19);
    word.dataset.wordlightDepth = depth;
    word.style.setProperty('--wordlight-depth', `${depth * .35}px`);
  });

  let selected = null;
  let frame = 0;
  let pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  const coarsePointer = matchMedia('(pointer: coarse)');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function wrapTextNode(node) {
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) return fragment.append(part);
      const span = document.createElement('span');
      span.className = 'wordlight__word';
      span.textContent = part;
      fragment.append(span);
    });
    node.replaceWith(fragment);
  }

  function render() {
    frame = 0;
    const { x, y } = pointer;
    root.style.setProperty('--wordlight-x', `${(x / innerWidth) * 100}%`);
    root.style.setProperty('--wordlight-y', `${(y / innerHeight) * 100}%`);
    root.style.setProperty('--wordlight-pointer-x', `${x}px`);
    root.style.setProperty('--wordlight-pointer-y', `${y}px`);

    if (!reduceMotion) {
      allWords.forEach(word => {
        const rect = word.getBoundingClientRect();
        const dx = rect.left + rect.width / 2 - x;
        const dy = rect.top + rect.height / 2 - y;
        const distance = Math.max(70, Math.hypot(dx, dy));
        const depth = Number(word.dataset.wordlightDepth);
        const cast = depth * 1.15;
        const proximity = Math.max(0, 1 - distance / 620);
        const shadowX = (dx / distance) * cast;
        const shadowY = (dy / distance) * cast;

        word.style.setProperty('--wordlight-brightness', (.44 + proximity * .56).toFixed(3));
        word.style.setProperty('--wordlight-shadow', `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px ${(2.5 + depth * .24).toFixed(1)}px rgba(0,0,0,.9)`);
      });
    }

    if (selected) {
      const rect = selected.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - x;
      const dy = rect.top + rect.height / 2 - y;
      const distance = Math.max(100, Math.hypot(dx, dy));
      root.style.setProperty('--wordlight-cast-x', `${(dx / distance) * 42}px`);
      root.style.setProperty('--wordlight-cast-y', `${(dy / distance) * 30}px`);
    }
  }

  function schedule(event) {
    pointer = coarsePointer.matches
      ? { x: innerWidth / 2, y: innerHeight / 2 }
      : event ? { x: event.clientX, y: event.clientY } : pointer;
    if (!frame) frame = requestAnimationFrame(render);
  }

  function clear({ restoreFocus = false } = {}) {
    const previous = selected;
    selected?.classList.remove('wordlight__selected');
    selected = null;
    elements.projection.textContent = '';
    root.classList.remove('wordlight--focused');
    elements.back?.setAttribute('tabindex', '-1');
    if (restoreFocus) previous?.focus();
    schedule();
  }

  function select(noun) {
    if (selected === noun) return clear({ restoreFocus: true });
    selected?.classList.remove('wordlight__selected');
    selected = noun;
    selected.classList.add('wordlight__selected');
    elements.projection.textContent = noun.dataset.definition;
    root.classList.add('wordlight--focused');
    elements.back?.removeAttribute('tabindex');
    schedule();
  }

  nouns.forEach(noun => noun.addEventListener('click', () => select(noun)));
  elements.back?.addEventListener('click', () => clear({ restoreFocus: true }));
  document.addEventListener('click', event => {
    if (!selected || selected.contains(event.target) || elements.back?.contains(event.target)) return;
    clear();
  });
  addEventListener('pointermove', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && selected) clear({ restoreFocus: true });
  });
  schedule();

}
