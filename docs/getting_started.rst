Getting Started
===============

Here you install pyGD and watch a network of oscillators synchronize.

Installation
^^^^^^^^^^^^

pyGD requires Python 3.8 or newer, and rests on numpy, scipy, networkx, and
matplotlib. Clone the repository and install it into a virtual environment::

    git clone https://github.com/EternalTime/pyGD.git
    cd pyGD
    python3 -m venv .venv
    source .venv/bin/activate
    python -m pip install --upgrade pip
    pip install -e .

The ``-e`` flag installs in editable mode, so changes to the source are picked
up immediately. Check it::

    >>> import pyGD

Your first synchronization
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Put an oscillator with a random natural frequency on every node of an
Erdős–Rényi graph and let the coupling pull them together::

    import numpy as np
    import networkx as nx
    from pyGD import Kuramoto

    rng = np.random.default_rng(0)
    G = nx.erdos_renyi_graph(500, 0.02, seed=0)
    omegas = rng.standard_normal(G.number_of_nodes())

    env = Kuramoto(sigma=2.0, G=G, omegas=omegas, rng=rng)
    r_history = env.run(600, record=True)

    print(r_history[-1])   # order parameter after 600 steps

The order parameter ``r`` runs from 0, a scatter of phases pointing every which
way, to 1, a single spike of oscillators all aligned. With the coupling this
far above threshold, the tail of ``r_history`` should sit close to 1. Color the
nodes by their phases and watch the alignment directly::

    import matplotlib.pyplot as plt

    env.plot_phases()
    plt.show()

Now introduce the agent, which hops the same graph and fights the
synchronization the coupling is building::

    from pyGD import Yokai

    env = Kuramoto(sigma=2.0, G=G, omegas=omegas, rng=rng)
    yok = Yokai(strength=0.5, beta=0.16, env=env, rng=rng)

    for _ in range(600):
        yok.evolve(env)
        env.evolve()
    env.update_order_parameter()
    print(env.r)            # lower than the agent-free run above

The gap between the two values of ``r`` is the agent doing its work. How it
behaves as you sweep the coupling is the subject of :doc:`guide_yokai`; first
meet the dynamics the agent acts on in :doc:`guide_dynamics`.
