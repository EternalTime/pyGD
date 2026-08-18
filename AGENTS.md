# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## Layout

The repository root *is* the `pyGD` package (`__init__.py`, `dynamics.py`, `agents.py`
at top level, mapped via `[tool.setuptools.package-dir]` in `pyproject.toml`). Install
with `pip install -e ".[test,docs]"` before running `pytest` or `sphinx-build -b html docs docs/_build/html`.

## Explicit Euler: `dt * sigma * lambda_max(L)` must stay below ~2

`Kuramoto.evolve` is an explicit Euler step with a default `dt = 1/16`, so the coupling
you may ask for is bounded: past `dt * sigma * lambda_max(L) ~ 2`, where `lambda_max(L)`
is the largest graph-Laplacian eigenvalue, the stiffest modes overshoot every step and
drive `r` *down*, an artifact that looks like real partial locking. `k_max` is only an
optimistic proxy for `lambda_max(L)`. Sanity-check any new coupling against a run with
`dt` refined 8x. The derivation, the proxy bounds, and the measured error per `sigma`
belong to `docs/guide_dynamics.rst` ("How far you can push the coupling") - re-measure
and update them there, not here.

## The documented demonstration regime

`sigma=0.5, strength=0.5, beta=0.16` is the regime where the Yokai visibly wins, and it
is also the applet's defaults in `docs/_static/gd_applet.js` - keep the README quick
start, `docs/guide_yokai.rst`, and the applet on the same regime. The agent's authority
is its kick rate (`strength * speed / dt`) against the coupling's pull (`sigma * <k>`),
so it loses its grip as coupling rises; `docs/guide_yokai.rst` ("Where the agent has
authority") owns that sweep.

`tests/test_slice.py` asserts both doc claims - that the agent lowers `r` in this regime,
and that the default `dt` is faithful there - so the doc numbers cannot silently rot.

## Driving the agent

There is no agent-aware `run()`. The supported pattern is the hand-rolled loop
(`yok.evolve(env)` then `env.evolve()`), as shown in `Yokai`'s docstring. Comparisons
between an agent-free and an agent-driven run must seed the environment identically and
give the agent a `Generator` of its own - reusing one across both runs gives them
different initial phases, a difference large enough to swamp a small effect.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
