Getting Started
===============

In this guide you will install pyGD and watch a network of oscillators
synchronize. The library rests on numpy, scipy, networkx, and matplotlib —
nothing exotic — so the install is quick.

Installation
^^^^^^^^^^^^

pyGD requires Python 3.8 or newer. Clone the repository and install it into a
virtual environment::

    git clone https://github.com/EternalTime/pyGD.git
    cd pyGD
    python3 -m venv .venv
    source .venv/bin/activate
    python -m pip install --upgrade pip
    pip install -e .

The ``-e`` flag installs in editable mode — changes you make to the source are
picked up immediately. Check the install::

    >>> import pyGD

Your first synchronization
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Build an Erdős–Rényi graph, place an oscillator on every node with a random
natural frequency, and let the coupling pull them together::

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
way, to 1, a single spike of oscillators all aligned. With the coupling set
well above threshold, the tail of ``r_history`` should sit close to 1. Watch
the alignment directly by coloring the nodes with their phases::

    import matplotlib.pyplot as plt

    env.plot_phases()
    plt.show()

Now introduce the agent. The Yokai hops across the same graph and fights the
synchronization the coupling is trying to build::

    from pyGD import Yokai

    env = Kuramoto(sigma=2.0, G=G, omegas=omegas, rng=rng)
    yok = Yokai(strength=0.5, beta=0.16, env=env, rng=rng)

    for _ in range(600):
        yok.evolve(env)
        env.evolve()
    env.update_order_parameter()
    print(env.r)            # lower than the agent-free run above

Run both to the same coupling and compare the two values of ``r`` — the gap is
the agent doing its work. How that gap behaves as you sweep the coupling, and
what it costs the agent to sustain it, is the subject of :doc:`guide_yokai`.
First, though, meet the dynamics the agent acts on in :doc:`guide_dynamics`.
