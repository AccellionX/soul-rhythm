# Soul Rhythm prototype

A static, clickable sales prototype for Lori's personal brand. Open `index.html` through a local server, or deploy the folder as-is. There is no build step.

## Swap in the real photographs

Drop these files into `images/` using these exact names:

- `images/neighborhood.jpg`
- `images/porch.jpg`
- `images/pond.jpg`
- `images/study.jpg`
- `images/garage.jpg`

Until a file is present, that scene shows a warm sage/gold/terracotta gradient and the scene name. After you add a photo, reload the page. No code changes are needed.

Optional pond ambience: add `audio/pond.mp3`. The Journey sound toggle stays off by default and fails silently if the file is missing.

## Adjust porch hotspot positions

Hotspots are percentages of the porch image, defined at the top of `app.js` in `PORCH_HOTSPOTS`.

```js
const PORCH_HOTSPOTS = [
  { id: "bird-feeder", label: "Bird feeder", target: "journey", x: 16, y: 24 },
  { id: "book", label: "Book", target: "stories", x: 72, y: 70 },
  { id: "metal-art", label: "Metal art", target: "consulting", x: 86, y: 28 },
  { id: "heart-sign", label: "Heart sign", target: "meet-lori", x: 48, y: 56, pulse: true }
];
```

`x: 0` / `y: 0` is the top-left of the porch image. `x: 100` / `y: 100` is the bottom-right. Below 768px the photo is shown full-width at 16:9 with no crop, so these percentages map to the image itself. After the real porch photo is in place, nudge the numbers until each circle sits on the right object.

## Deploy

The site is three files plus folders. Publish the project root (the folder that contains `index.html`).

**Netlify:** drag the folder onto [app.netlify.com/drop](https://app.netlify.com/drop), or run `netlify deploy --dir . --prod` from this directory.

**Vercel:** run `vercel --yes` from this directory, or import the GitHub repo and leave the build command empty, output directory `.`.

Custom domain, HTTPS, and headers can be added later in either dashboard. No redirects are required; this is a single-page prototype.
