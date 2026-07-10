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

<script type="module">
  import { createWordlight } from './wordlight.js';

  createWordlight({
    wall: '.wordlight__wall',
    light: '.wordlight__light',
    projection: '.wordlight__projection'
  });
</script>
```

Pass an optional `back` selector or element to expose a control that restores the full text wall. Click a selected word again or press Escape to return as well.

## Notes

- No dependencies or build step.
- Uses standard browser APIs and CSS custom properties.
- On touch screens, the light source stays at the viewport center and definitions work by tapping.
- Click or tap outside a selected word to dismiss its definition.
- Honors `prefers-reduced-motion`.

## License

[MIT](LICENSE)
