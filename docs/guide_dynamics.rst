Kuramoto Dynamics
=================

A Kuramoto oscillator\ :footcite:`kuramoto1975` is a single phase
:math:`\theta_i` turning on a circle at its own natural frequency
:math:`\omega_i`. Couple a population of them on a
graph and let each feel a pull toward the phases of its neighbors, and above a
critical coupling they abandon their private frequencies and turn as one. pyGD
gives you that population as a class you drive one step at a time.

Driving the class
^^^^^^^^^^^^^^^^^

:class:`~pyGD.dynamics.Kuramoto` ports the original MATLAB class. It takes a
coupling ``sigma``, a :mod:`networkx` graph, and a vector of natural
frequencies; it pulls the adjacency out once as a sparse matrix and steps the
phases with an explicit Euler update. ``evolve`` advances one step, ``run``
advances many, and ``update_order_parameter`` refreshes the collective
quantities you measure::

    import numpy as np
    import networkx as nx
    from pyGD import Kuramoto

    rng = np.random.default_rng(1)
    G = nx.erdos_renyi_graph(400, 0.03, seed=1)
    omegas = rng.standard_normal(G.number_of_nodes())

    env = Kuramoto(sigma=1.5, G=G, omegas=omegas, rng=rng)
    env.run(500)                 # transient, unmeasured
    r_hist = env.run(200, record=True)
    print(r_hist.mean())

How far you can push the coupling
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The update is explicit Euler, so ``dt`` is not a free parameter: the stiffest
term in the equation is :math:`\sigma k_{\max}`, and the step stays faithful
only while :math:`\sigma\,k_{\max}\,dt` stays below roughly 2. Past that the
high-degree nodes overshoot every step and ``r`` starts to *fall* as you raise
the coupling — a numerical artifact that looks exactly like physics.

On an :math:`N = 500`, :math:`p = 0.02` graph (:math:`k_{\max} = 19`) at the
default ``dt = 1/16``, comparing against a run with ``dt`` refined 8x:

.. list-table::
   :header-rows: 1

   * - ``sigma``
     - :math:`\sigma k_{\max} dt`
     - ``r`` at ``dt = 1/16``
     - ``r`` converged
   * - 1.0
     - 1.19
     - 0.9887
     - 0.9887
   * - 1.5
     - 1.78
     - 0.9944
     - 0.9951
   * - 2.0
     - 2.38
     - 0.9410
     - 0.9972

The last row is the trap: ``r = 0.94`` looks like a plausible partially-locked
state, but the true answer is 0.997 and the missing 0.06 is integration error.
If you need a larger ``sigma``, shrink ``dt`` to match — and remember that
``Yokai``'s ``speed`` is defined per environment step, so halving ``dt`` also
doubles how fast the agent hops in physical time.

The order parameter carries the story. Writing :math:`Z = r\,e^{i\phi}` for the
population average of :math:`e^{i\theta}`, the magnitude :math:`r` measures how
tightly the phases bunch and :math:`\phi` gives the mean phase they bunch
around. Both live on the object as ``env.r``, ``env.phi``, and ``env.Z`` once
``update_order_parameter`` has run.

The synchronization transition
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The single number worth plotting first is :math:`r` as a function of coupling.
Below a critical :math:`\sigma_c` the oscillators ignore each other and
:math:`r` sits near zero; above it, an extensive fraction locks and :math:`r`
climbs toward one\ :footcite:`strogatz2000,acebron2005`. Sweep the coupling and watch the knee appear::

    import numpy as np
    import networkx as nx
    from pyGD import Kuramoto

    G = nx.erdos_renyi_graph(400, 0.05, seed=2)
    sigmas = np.linspace(0, 1.0, 24)

    curve = []
    for sigma in sigmas:
        rng = np.random.default_rng(0)
        omegas = rng.standard_normal(G.number_of_nodes())
        env = Kuramoto(sigma, G, omegas, rng=rng)
        env.run(500)
        curve.append(env.run(200, record=True).mean())

Plot ``curve`` against ``sigmas`` and you have the shape every figure in the
paper\ :footcite:`sowinski2024information` is built on. Convince yourself the
knee moves when you change the graph's density — a sparser graph needs stronger
coupling to lock\ :footcite:`rodrigues2016`.

The coarse-grained limit
^^^^^^^^^^^^^^^^^^^^^^^^^^

:class:`~pyGD.dynamics.KuramotoCG` is the same environment with the agent
folded in. Rather than simulate a demon hopping and kicking, it adds two terms
the demon leaves behind in the continuum limit — a degree-weighted shift of the
natural frequencies and a Wiener fluctuation whose amplitude grows with node
degree, so that hubs sit in hotter baths than leaves. The two agent parameters
survive only through their product ``ab`` :math:`= \alpha\beta`::

    from pyGD import KuramotoCG

    rng = np.random.default_rng(3)
    env = KuramotoCG(sigma=0.4, G=G, omegas=rng.standard_normal(G.number_of_nodes()),
                     ab=0.08, rng=rng)
    env.run(500)
    print(env.run(200, record=True).mean())

The two dynamics are kept as independent classes, exactly as the MATLAB has
them; the derivation that turns one into the other is sketched in
:doc:`theory` and given in full in the paper. To watch the demon itself rather
than its shadow, go to :doc:`guide_yokai`.

References
^^^^^^^^^^

.. footbibliography::
