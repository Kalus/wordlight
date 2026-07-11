# Wordlight

A dependency-free browser effect that turns a wall of text into a pointer-lit field. Words brighten near the light source and cast dimensional shadows; selectable terms can collapse the wall into a projected definition.

## Try it

Open `demo/index.html` directly in any modern browser. It is fully self-contained—no server, dependencies, or build step required.

## Use it

Include the stylesheet and module:

```html
<link rel="stylesheet" href="path/to/wordlight.css">

<p class="wordlight__wall">
  A <button data-definition="A small vessel for a shared idea." type="button">word</button> can cast a definition.
</p>
<div class="wordlight__light"></div>
<div class="wordlight__projection"></div>
<button class="wordlight__motion-toggle" type="button" hidden aria-pressed="false">Enable motion</button>

<script type="module">
  import { createWordlight } from './wordlight.js';

  createWordlight({
    wall: '.wordlight__wall',
    light: '.wordlight__light',
    projection: '.wordlight__projection',
    motion: '.wordlight__motion-toggle'
  });
</script>
```

Pass an optional `back` selector or element to expose a control that restores the full text wall. Pass an optional `motion` button to enable tilt-controlled lighting on supported touch devices. Click a selected word again or press Escape to return as well.

## Notes

- No dependencies or build step.
- Uses standard browser APIs and CSS custom properties.
- On touch screens, the light source stays at the viewport center until motion is enabled; definitions work by tapping.
- iOS motion access is requested from the motion button and requires an HTTPS page.
- Fine-pointer devices add a subtle idle float around the last pointer position while preserving precise tracking during movement.
- Click or tap outside a selected word to dismiss its definition.
- Honors `prefers-reduced-motion`.

## License

[MIT](LICENSE)
