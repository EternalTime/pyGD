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

    G = nx.erdos_renyi_graph(500, 0.02, seed=4)
    omegas = np.random.default_rng(4).standard_normal(G.number_of_nodes())

    env = Kuramoto(sigma=0.5, G=G, omegas=omegas, rng=np.random.default_rng(0))
    yok = Yokai(strength=0.5, beta=0.16, env=env, rng=np.random.default_rng(1))

    for _ in range(600):
        yok.evolve(env)      # the agent kicks and hops
        env.evolve()         # the oscillators relax back toward each other
    env.update_order_parameter()
    print(env.r)             # 0.024 against 0.954 without the agent

The order of the two calls is the whole contest: the agent scatters phases, the
coupling gathers them, and ``r`` settles wherever the two forces balance. Drop
the ``yok.evolve(env)`` line and the same environment locks at ``r = 0.954``,
so at this coupling the agent is winning the contest outright.

Where the agent has authority
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

That balance is a real contest, not a foregone conclusion. The agent injects
phase at a rate set by ``strength * speed / dt``; the coupling pulls back at a
rate set by ``sigma`` times the mean degree. Raise ``sigma`` at fixed agent
settings and the agent loses its grip — on the graph above, with
``strength=0.5, beta=0.16``:

.. list-table::
   :header-rows: 1

   * - ``sigma``
     - agent-free ``r``
     - with agent ``r``
   * - 0.3
     - 0.832
     - 0.034
   * - 0.5
     - 0.949
     - 0.050
   * - 0.8
     - 0.982
     - 0.631
   * - 1.0
     - 0.989
     - 0.948
   * - 1.5
     - 0.994
     - 0.980

By ``sigma = 1.5`` a single agent kicking one node at a time simply cannot
keep up with 500 oscillators pulling on each other, and the effect shrinks into
the run-to-run scatter. If you want a visible effect at higher coupling, raise
``beta`` (more hops per step) rather than expecting the default agent to scale.
Note also that the explicit Euler step stops being faithful before ``sigma``
gets very large — see :doc:`guide_dynamics` — so a high-``sigma`` run can
mislead you twice over.

Strength and speed enter together
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The agent has two knobs — how hard it kicks (:math:`\alpha`, ``strength``) and
how fast it hops (:math:`\beta`, ``beta``, which sets ``speed`` as a fraction of
the network size). A remarkable degeneracy hides in them: a weak, fast agent and
a strong, slow one behave identically as long as the product
:math:`\alpha\beta` matches. You can watch the two collapse onto each other::

    def final_r(strength, beta, seed=0):
        env = Kuramoto(0.5, G, omegas, rng=np.random.default_rng(seed))
        yok = Yokai(strength, beta, env, rng=np.random.default_rng(seed + 1))
        for _ in range(600):
            yok.evolve(env)
            env.evolve()
        env.update_order_parameter()
        return env.r

    # same product alpha*beta = 0.08, different factors
    print(final_r(0.5, 0.16))   # 0.024
    print(final_r(0.8, 0.10))   # 0.035

Both land near 0.02–0.04, far below the agent-free 0.954, and much closer to
each other than either is to the agent-free value. That single product is
exactly the ``ab`` you hand to :class:`~pyGD.dynamics.KuramotoCG` — the
coarse-grained dynamics remembers the agent only through it. Run the
comparison at a coupling where the agent still has authority: once ``sigma`` is
high enough that neither agent moves ``r``, the two numbers agree only because
both are doing nothing.

Blinding the sensor
^^^^^^^^^^^^^^^^^^^

Because the agent must measure before it acts, you can ask what its measurements
are worth by corrupting them. The ``noise`` parameter (:math:`\eta`, from 0 to
1) blurs the agent's read of the local mean field; at :math:`\eta = 1` it kicks
blind::

    env = Kuramoto(0.5, G, omegas, rng=np.random.default_rng(5))
    yok = Yokai(0.5, 0.16, env, noise=0.5, rng=np.random.default_rng(6))

Sweep ``noise`` from 0 to 1 and measure how much desynchronization survives.
Averaged over a few seeds on the graph above, ``r`` runs roughly 0.07, 0.03,
0.49, 0.87, 0.91 as :math:`\eta` takes 0, 0.25, 0.5, 0.75, 1. The agent keeps
its grip while its measurement is roughly right, then loses it entirely once
the read is worthless — and the kicks never changed size, only their aim.

Whether the agent's information is worth anything — whether corrupting it costs
the agent its grip — turns out to depend on the graph, and that dependence is
the paper's central result. The theory page states it; the paper proves
it\ :footcite:`sowinski2024information`.

References
^^^^^^^^^^

.. footbibliography::
