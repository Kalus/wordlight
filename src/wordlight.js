/**
 * Turn a text wall into a pointer-lit field of words.
 *
 * Required markup: a wall element containing text and buttons with
 * `data-definition`, plus an empty projection element.
 */
export function createWordlight({ wall, projection, light, back, motion, root = document.body }) {
  const resolve = value => typeof value === 'string' ? document.querySelector(value) : value;
  const elements = {
    wall: resolve(wall),
    projection: resolve(projection),
    light: resolve(light),
    back: resolve(back),
    motion: resolve(motion)
  };

  if (!elements.wall || !elements.projection || !elements.light) {
    throw new Error('Wordlight needs wall, projection, and light elements.');
  }

  root.classList.add('wordlight');
  elements.projection.setAttribute('aria-live', 'polite');
  elements.projection.setAttribute('aria-atomic', 'true');
  elements.back?.setAttribute('tabindex', '-1');
  elements.motion?.setAttribute('hidden', '');
  elements.motion?.setAttribute('aria-pressed', 'false');
  elements.motion?.classList.add('wordlight__motion-toggle');

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

  let pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  let pointerAnchor = { ...pointer };
  let motionTarget = { ...pointer };
  let motionOrigin = null;
  let selected = null;
  let frame = 0;
  let floatFrame = 0;
  let motionFrame = 0;
  let lastFloatFrame = 0;
  let lastPointerInput = 0;
  let castX = 0;
  let castY = 0;
  let motionEnabled = false;
  const coarsePointer = matchMedia('(pointer: coarse)');
  const finePointer = matchMedia('(pointer: fine)');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionAvailable = 'DeviceMotionEvent' in window;

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
        const cast = 18 + depth * .28;
        const blur = 5 + depth * .06;
        const proximity = Math.max(0, 1 - distance / 620);
        const shadowX = (dx / distance) * cast;
        const shadowY = (dy / distance) * cast;

        word.style.setProperty('--wordlight-brightness', (.44 + proximity * .56).toFixed(3));
        word.style.setProperty('--wordlight-shadow', `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px ${blur.toFixed(1)}px rgba(0,0,0,.92)`);
      });
    }

    if (selected) {
      const rect = selected.getBoundingClientRect();
      const selectedX = rect.left + rect.width / 2;
      const selectedY = rect.top + rect.height / 2;
      const dx = selectedX - x;
      const dy = selectedY - y;
      const distance = Math.hypot(dx, dy);
      const fallbackDistance = Math.hypot(selectedX - innerWidth / 2, selectedY - innerHeight / 2);
      const directionX = distance > 6
        ? dx / distance
        : fallbackDistance > 6 ? (selectedX - innerWidth / 2) / fallbackDistance : 0;
      const directionY = distance > 6
        ? dy / distance
        : fallbackDistance > 6 ? (selectedY - innerHeight / 2) / fallbackDistance : 1;
      const deadzone = 120;
      const cast = clamp(84 + Math.max(0, distance - deadzone) * .3, 84, 180);
      const targetCastX = directionX * cast;
      const targetCastY = directionY * cast;
      const castResponse = distance <= deadzone
        ? .025
        : clamp(.025 + (distance - deadzone) / 380 * .2, .025, .225);

      castX += (targetCastX - castX) * castResponse;
      castY += (targetCastY - castY) * castResponse;
      root.style.setProperty('--wordlight-cast-x', `${castX}px`);
      root.style.setProperty('--wordlight-cast-y', `${castY}px`);
    }
  }

  function schedule(event) {
    if (!motionEnabled) {
      if (coarsePointer.matches) {
        pointer = { x: innerWidth / 2, y: innerHeight / 2 };
      } else if (event) {
        pointerAnchor = { x: event.clientX, y: event.clientY };
        lastPointerInput = performance.now();
        if (reduceMotion) pointer = { ...pointerAnchor };
      }
    }
    if (!frame) frame = requestAnimationFrame(render);
  }

  function animateIdle(now) {
    if (!finePointer.matches || reduceMotion || motionEnabled) {
      floatFrame = 0;
      return;
    }

    const tracking = now - lastPointerInput < 140;
    if (tracking || now - lastFloatFrame >= 33) {
      const t = now / 1000;
      const floatX = tracking ? 0 : Math.sin(t * .95) * 3.5 + Math.sin(t * .47) * 1.2;
      const floatY = tracking ? 0 : Math.cos(t * .8) * 2.8 + Math.sin(t * .36) * 1.1;
      const response = tracking ? .92 : .18;

      pointer.x += (pointerAnchor.x + floatX - pointer.x) * response;
      pointer.y += (pointerAnchor.y + floatY - pointer.y) * response;
      if (tracking && Math.abs(pointerAnchor.x - pointer.x) < .5 && Math.abs(pointerAnchor.y - pointer.y) < .5) {
        pointer = { ...pointerAnchor };
      }

      lastFloatFrame = now;
      if (!frame) frame = requestAnimationFrame(render);
    }

    floatFrame = requestAnimationFrame(animateIdle);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function animateMotion() {
    motionFrame = 0;
    pointer.x += (motionTarget.x - pointer.x) * .12;
    pointer.y += (motionTarget.y - pointer.y) * .12;
    schedule();
    if (motionEnabled && (Math.abs(motionTarget.x - pointer.x) > .4 || Math.abs(motionTarget.y - pointer.y) > .4)) {
      motionFrame = requestAnimationFrame(animateMotion);
    }
  }

  function handleMotion(event) {
    const gravity = event.accelerationIncludingGravity;
    const x = Number(gravity?.x);
    const y = Number(gravity?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (!motionOrigin) motionOrigin = { x, y };

    motionTarget.x = innerWidth / 2 + clamp((x - motionOrigin.x) / 4.8, -1, 1) * innerWidth * .42;
    motionTarget.y = innerHeight / 2 - clamp((y - motionOrigin.y) / 4.8, -1, 1) * innerHeight * .42;
    if (!motionFrame) motionFrame = requestAnimationFrame(animateMotion);
  }

  async function enableMotion() {
    if (!elements.motion) return;
    elements.motion.disabled = true;
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function'
        && await DeviceMotionEvent.requestPermission() !== 'granted') {
        throw new Error('permission denied');
      }
      addEventListener('devicemotion', handleMotion, { passive: true });
      motionEnabled = true;
      elements.motion.textContent = 'Motion on';
      elements.motion.setAttribute('aria-pressed', 'true');
      root.classList.add('wordlight--motion-enabled');
      animateMotion();
    } catch {
      elements.motion.textContent = 'Motion unavailable';
    } finally {
      elements.motion.disabled = false;
    }
  }

  function clear({ restoreFocus = false } = {}) {
    const previous = selected;
    selected?.classList.remove('wordlight__selected');
    selected = null;
    castX = 0;
    castY = 0;
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
    if (!selected || selected.contains(event.target) || elements.back?.contains(event.target) || elements.motion?.contains(event.target)) return;
    clear();
  });
  if (elements.motion && coarsePointer.matches && motionAvailable) {
    elements.motion.hidden = false;
    elements.motion.addEventListener('click', enableMotion);
  }
  addEventListener('pointermove', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && selected) clear({ restoreFocus: true });
  });
  schedule();
  if (finePointer.matches && !reduceMotion) floatFrame = requestAnimationFrame(animateIdle);

}
