# pyGD

pyGD runs the Kuramoto model of coupled phase oscillators and lets you
interfere with it. The oscillators live on the nodes of a graph, each pulled
toward the phases of its neighbors; turn up the coupling and they synchronize.
On top of them lives an agent — the *Yokai* — that hops from node to node,
reads the local mean field, and kicks each phase it visits in the direction
that opposes synchrony.

The library ships two dynamics and one agent: `Kuramoto` is the oscillator
environment, `Yokai` is the agent that drives it out of step, and `KuramotoCG`
is the coarse-grained continuum limit — the stochastic dynamics you reach when
the agent is integrated out. Graphs come from
[networkx](https://networkx.org); the dynamics only ever see the sparse
adjacency matrix, so any graph networkx can build is a graph pyGD can run. The
model and the information-theoretic reading of the agent are in Sowinski,
Frank & Ghoshal, *Phys. Rev. Research* **6**, 043188 (2024).

This is a Python port of the original MATLAB classes, whose interface it keeps.

## Installation

```
git clone https://github.com/EternalTime/pyGD.git
cd pyGD
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e .
```

Requires Python 3.8+; numpy, scipy, networkx, and matplotlib are installed
automatically. The authoritative install instructions are the
[Getting Started](https://damiansowinski.com/pyGD/getting_started.html) page of
the hosted documentation.

## Quick start

Build an Erdős–Rényi graph, put an oscillator with a random natural frequency
on every node, and let the coupling pull them together:

```python
import numpy as np
import networkx as nx
from pyGD import Kuramoto

G = nx.erdos_renyi_graph(500, 0.02, seed=0)
omegas = np.random.default_rng(0).standard_normal(G.number_of_nodes())

env = Kuramoto(sigma=0.5, G=G, omegas=omegas, rng=np.random.default_rng(1))
r_history = env.run(600, record=True)

print(r_history[-1])   # 0.9474... — order parameter after 600 steps
```

The order parameter `r` runs from 0 (phases scattered every which way) to 1
(all oscillators aligned). At `sigma=0.5` this graph is well past its
synchronization threshold, so the oscillators lock and `r` settles near 0.95.
Now introduce the agent — the Yokai hops the same graph and fights the
synchronization the coupling is building:

```python
from pyGD import Yokai

env = Kuramoto(sigma=0.5, G=G, omegas=omegas, rng=np.random.default_rng(1))
yok = Yokai(strength=0.5, beta=0.16, env=env, rng=np.random.default_rng(2))

for _ in range(600):
    yok.evolve(env)
    env.evolve()
env.update_order_parameter()
print(env.r)            # 0.0457... — the agent holds the phases apart
```

Both runs seed the environment with `default_rng(1)`, so they start from the
same initial phases and differ only by the agent; the agent gets its own
generator so its hops don't perturb the comparison. Run both and compare the
two values of `r` — 0.95 against 0.05 is the agent doing its work.

The agent wins here because it can inject phase faster than the coupling
re-entrains it. Raise `sigma` and that balance tips: by `sigma=1.0` the same
agent only drags `r` from 0.989 to 0.946, and by `sigma=1.5` from 0.994 to
0.981. Coupling strong enough to outrun the agent also outruns the
integrator — see [the note on the Euler
step](https://damiansowinski.com/pyGD/guide_dynamics.html) before reading much
into a high-`sigma` run.

## Documentation

The documentation is hosted at
[damiansowinski.com/pyGD](https://damiansowinski.com/pyGD/); the guides cover
getting started, the dynamics, and the Yokai agent. To build locally, from the
clone with the virtual environment active:

```
source .venv/bin/activate
pip install -e ".[docs]"
sphinx-build -b html docs docs/_build/html
```

## Tests

From the clone with the virtual environment active:

```
source .venv/bin/activate
pip install -e ".[test]"
pytest
```

## License

MIT
