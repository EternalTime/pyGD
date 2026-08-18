# pyGD

pyGD runs the Kuramoto model of coupled phase oscillators and lets you
interfere with it. The oscillators live on the nodes of a graph, each pulled
toward the phases of its neighbors; turn up the coupling and they synchronize.
On top of them lives an agent - the *Yokai* - that hops from node to node,
reads the local mean field, and kicks each phase it visits against the
alignment it finds there.

`Kuramoto` is the environment, `Yokai` the agent that drives it out of step,
and `KuramotoCG` the continuum limit you reach when the agent is integrated
out. Graphs come from [networkx](https://networkx.org), and the dynamics only
ever see the sparse adjacency matrix. The model and the information-theoretic
reading of the agent are in Sowinski, Frank & Ghoshal, *Phys. Rev. Research*
**6**, 043188 (2024). This is a Python port of the original MATLAB classes,
whose interface it keeps.

## Installation

```
git clone https://github.com/EternalTime/pyGD.git
cd pyGD
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e .
```

Requires Python 3.8+; numpy, scipy, networkx, and matplotlib come along
automatically. The
[Getting Started](https://damiansowinski.com/pyGD/getting_started.html) page is
authoritative.

## Quick start

Put an oscillator with a random natural frequency on every node of an
Erdős–Rényi graph and let the coupling pull them together:

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

The order parameter `r` runs from 0, phases scattered every which way, to 1,
all oscillators aligned. At `sigma=0.5` this graph is well past threshold, so
`r` settles near 0.95. Now put the Yokai on it:

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

Both runs seed the environment with `default_rng(1)`, so they differ only by
the agent, and the agent gets a generator of its own so its hops don't perturb
the comparison. The 0.95 against 0.05 is the agent doing its work.

The agent wins here because it injects phase faster than the coupling
re-entrains it. Raise `sigma` and the balance tips: by `sigma=1.0` it drags `r`
only from 0.989 to 0.946, and by `sigma=1.5` from 0.994 to 0.981. Coupling
strong enough to outrun the agent also outruns the integrator, so read [the
note on the Euler step](https://damiansowinski.com/pyGD/guide_dynamics.html)
before trusting a high-`sigma` run.

## Documentation

Hosted at [damiansowinski.com/pyGD](https://damiansowinski.com/pyGD/). To build
it locally, with the virtual environment active:

```
source .venv/bin/activate
pip install -e ".[docs]"
sphinx-build -b html docs docs/_build/html
```

## Tests

```
source .venv/bin/activate
pip install -e ".[test]"
pytest
```

## License

MIT - see [LICENSE](LICENSE).
