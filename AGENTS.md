# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## Layout

The repository root *is* the `pyGD` package (`__init__.py`, `dynamics.py`, `agents.py`
at top level, mapped via `[tool.setuptools.package-dir]` in `pyproject.toml`). Install
with `pip install -e ".[test,docs]"` before running `pytest` or `sphinx-build -b html docs docs/_build/html`.

## Explicit Euler: `sigma * k_max * dt` must stay below ~2

`Kuramoto.evolve` is an explicit Euler step with a default `dt = 1/16`. The stiffest
term is `sigma * k_max`, so raising `sigma` past `2 / (k_max * dt)` makes high-degree
nodes overshoot every step and drives `r` *down* — an artifact that looks like real
partial locking. On the docs' N=500, p=0.02 graph (`k_max = 19`) the default `dt` is
faithful to sigma≈1.5 and badly wrong by sigma=2.0 (r = 0.941 vs 0.997 converged).
Sanity-check any new coupling against a run with `dt` refined 8x.

## The documented demonstration regime

`sigma=0.5, strength=0.5, beta=0.16` is the regime where the Yokai visibly wins
(`r` ~0.95 without the agent, ~0.05 with it). These are also the applet's defaults in
`docs/_static/gd_applet.js` — keep the docs and the applet on the same regime. The
agent's authority scales as kick rate (`strength * speed / dt`) over `sigma * <k>`, so
it loses its grip as coupling rises: by sigma=1.5 it barely moves `r`.

`tests/test_slice.py` asserts both facts (the agent lowers `r`, and the default `dt` is
faithful there), so doc numbers cannot silently rot. Re-measure and update the docs if
those tests change.

## Driving the agent

There is no agent-aware `run()`. The supported pattern is the hand-rolled loop
(`yok.evolve(env)` then `env.evolve()`), as shown in `Yokai`'s docstring. Comparisons
between an agent-free and an agent-driven run must seed the environment identically —
reusing one `Generator` across both runs gives them different initial phases, worth
~±0.008 in final `r`, enough to swamp a small effect.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
