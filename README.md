# PGPG project page

Project page for **Progress-Guided Preference Generation for Aligning Generative Control Policies** (CoRL 2026).
It is a static site with no build step: serve the folder and open `index.html`.

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Files

| File | Contents |
| --- | --- |
| `index.html` | The page: hero, overview, abstract, method, Robomimic, VLA, analysis, BibTeX |
| `style.css` | Design tokens and components, adapted from the [R2A project page](https://retrieve2act.github.io/r2a/) |
| `page.js` | Reading progress bar, side contents, reveal on scroll, BibTeX copy, KaTeX helper |
| `results.js` | Every number on the page, with its source in the paper, and the interactive charts |
| `lab.js` | The preference lab: a toy 2-D task that runs ORCA (Eq. 2), marginal scoring (Eq. 3-4), max over demos (Eq. 6) and the threshold (Eq. 5) live |
| `pillars.js` | The three animated method sketches, after the panels of Fig. 1 |
| `assets/` | `overview.jpg/.webp` (rendered from `figs/overview.pdf`), `frames/` (Square frames from Fig. 1), `libero/` (LIBERO-10 frames from the appendix figure), `rollouts/` (LIBERO-10 evaluation videos, below) |

`assets/rollouts/tNN_{base,fbc,pgpg}.mp4` are evaluation episodes of the GR00T N1.7 checkpoints of the paper's
LIBERO-10 table (pretrained, Filtered BC, PGPG), copied unchanged from the eval logs, with the first frame as `.jpg`
poster. They cover the seven tasks where PGPG beats both baselines (T1, T2, T3, T4, T7, T8, T10): per task, a failed
episode of the pretrained policy and of Filtered BC and a successful one of PGPG, picked as the triple with the most
similar first frames over the three eval seeds (identical in T1 and T10). Each video is 512 x 256, third-person | wrist
camera, 20 fps (failures run to the 720-step limit, 18 s), with the instruction burned in from row 218 down; the page
crops to the top 216 rows.

Fig. 3 of the paper has no printed values, so its bars were decoded from the vector PDF; they match the
plotted bars to 0.1 and the paper's earlier results table exactly.

## Before publishing

- **Paper link**: the "Paper (soon)" button in `index.html` is disabled; add the PDF or arXiv URL and drop the `off` class.
- **Social preview**: `og:image` is relative (`assets/overview.jpg`); many crawlers need an absolute URL, so set it once the address is known.
- **Address**: GitHub serves a repository named `pgpg.github.io` at `https://pgpg.github.io` only if it belongs to an
  account or organization called `pgpg`. Under another account it is served at `https://<account>.github.io/pgpg.github.io/`.
  All paths on the page are relative, so it works at either address.
