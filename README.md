# Dillon Portfolio (Vue 3 + Vite)

Multi-page portfolio:
- Landing page with featured projects
- Projects index + per-project case study pages
- About, Contact

https://dbliss.github.io/

## Oh Hell browser game

The portfolio project page is `https://dbliss.github.io/#/projects/10-1`.
Play the game at `https://dbliss.github.io/10-1/`, or the bidding quiz at
`https://dbliss.github.io/10-1/bid-game/`.

The Pages workflow builds this portfolio, checks out `Dbliss/10-1` at `main`,
packages its Python/C engine, and includes its browser build at `dist/10-1/`.
Both ship in one Pages deployment; no separate game Pages setup is needed.
After pushing a game update, run **Deploy Vite site to GitHub Pages** from
this repository's Actions tab (or push a portfolio change) to publish it.

## 3D asset credits

The landing-page city is built from these assets:

- [Kenney](https://kenney.nl) — City Kit (Roads), City Kit (Suburban), City Kit (Commercial), Car Kit (CC0)
- ["Football stadium"](https://poly.pizza/m/6TZCkGh76m5) by Poly by Google (CC-BY 3.0) via poly.pizza
- ["Drone"](https://poly.pizza/m/DNbUoMtG3H) by NateGazzard (CC-BY 3.0) via poly.pizza
- Night HDRI + PBR ground textures from [Poly Haven](https://polyhaven.com) / [ambientCG](https://ambientcg.com) (CC0)

