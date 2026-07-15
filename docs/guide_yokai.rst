The Yokai
=========

The Yokai is a mobile agent that lives on a :class:`~pyGD.dynamics.Kuramoto`
environment and works to keep it out of step. It occupies one node at a time,
estimates the local mean-field angle, kicks its phase to oppose the local
alignment, then hops to a neighbor and does it again. It is a Maxwell's
demon\ :footcite:`maxwell1871` rebuilt for phase space — it must measure the
field before it acts — and since Kuramoto was Japanese, the demon that haunts
his model is a yokai.

Driving the agent
^^^^^^^^^^^^^^^^^

:class:`~pyGD.agents.Yokai` lives on a :class:`~pyGD.dynamics.Kuramoto`
environment and mutates it in place. At each node it visits it estimates the
local mean-field angle, compares it to the phase sitting there, and kicks that
phase by a fixed ``strength`` in whichever direction opposes the local
alignment — then hops to a random neighbor and does it again. One environment
step drives the agent through ``speed`` such kicks::

    import numpy as np
    import networkx as nx
    from pyGD import Kuramoto, Yokai

    rng = np.random.default_rng(4)
    G = nx.erdos_renyi_graph(500, 0.02, seed=4)
    omegas = rng.standard_normal(G.number_of_nodes())

    env = Kuramoto(sigma=2.0, G=G, omegas=omegas, rng=rng)
    yok = Yokai(strength=0.5, beta=0.16, env=env, rng=rng)

    for _ in range(600):
        yok.evolve(env)      # the agent kicks and hops
        env.evolve()         # the oscillators relax back toward each other
    env.update_order_parameter()
    print(env.r)

The order of the two calls is the whole contest: the agent scatters phases, the
coupling gathers them, and ``r`` settles wherever the two forces balance.

Strength and speed enter together
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The agent has two knobs — how hard it kicks (:math:`\alpha`, ``strength``) and
how fast it hops (:math:`\beta`, ``beta``, which sets ``speed`` as a fraction of
the network size). A remarkable degeneracy hides in them: a weak, fast agent and
a strong, slow one behave identically as long as the product
:math:`\alpha\beta` matches. You can watch the two collapse onto each other::

    def final_r(strength, beta, seed=0):
        rng = np.random.default_rng(seed)
        env = Kuramoto(2.0, G, omegas, rng=rng)
        yok = Yokai(strength, beta, env, rng=rng)
        for _ in range(600):
            yok.evolve(env)
            env.evolve()
        env.update_order_parameter()
        return env.r

    # same product alpha*beta = 0.08, different factors
    print(final_r(0.5, 0.16))
    print(final_r(0.8, 0.10))

The two lines should land close together, and both should sit below the
agent-free order parameter. That single product is exactly the ``ab`` you hand
to :class:`~pyGD.dynamics.KuramotoCG` — the coarse-grained dynamics remembers
the agent only through it.

Blinding the sensor
^^^^^^^^^^^^^^^^^^^

Because the agent must measure before it acts, you can ask what its measurements
are worth by corrupting them. The ``noise`` parameter (:math:`\eta`, from 0 to
1) blurs the agent's read of the local mean field; at :math:`\eta = 1` it kicks
blind::

    env = Kuramoto(2.0, G, omegas, rng=np.random.default_rng(5))
    yok = Yokai(0.5, 0.16, env, noise=0.5, rng=np.random.default_rng(6))

Sweep ``noise`` from 0 to 1 and measure how much desynchronization survives.
Whether the agent's information is worth anything — whether corrupting it costs
the agent its grip — turns out to depend on the graph, and that dependence is
the paper's central result. The theory page states it; the paper proves
it\ :footcite:`sowinski2024information`.

References
^^^^^^^^^^

.. footbibliography::
