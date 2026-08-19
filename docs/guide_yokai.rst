The Yokai
=========

The Yokai is a mobile agent that lives on a :class:`~pyGD.dynamics.Kuramoto`
environment and works to keep it out of step. It is a Maxwell's
demon\ :footcite:`maxwell1871` rebuilt for phase space - it must measure the
field before it acts - and since Kuramoto was Japanese, the demon that haunts
his model is a yokai.

Driving the agent
^^^^^^^^^^^^^^^^^

:class:`~pyGD.agents.Yokai` mutates its environment in place. At each node it
estimates the local mean-field angle, compares it to the phase sitting there,
kicks that phase by a fixed ``strength`` against the local alignment, then hops
to a random neighbor. One environment step drives it through ``speed`` such
kicks::

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
coupling gathers them, and ``r`` settles wherever the two balance. Drop the
``yok.evolve(env)`` line and the same environment locks at ``r = 0.954``.

Where the agent has authority
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The agent injects phase at a rate set by ``strength * speed / dt``; the
coupling pulls back at a rate set by ``sigma`` times the mean degree. Raise
``sigma`` at fixed agent settings and the agent loses its grip. Each row below
is a single 600-step run on the graph above at ``strength=0.5, beta=0.16``,
seeded as on this page (environment ``default_rng(0)``, agent
``default_rng(1)``) rather than a seed average, so it reproduces exactly:

.. list-table::
   :header-rows: 1

   * - ``sigma``
     - agent-free ``r``
     - with agent ``r``
   * - 0.3
     - 0.849
     - 0.027
   * - 0.5
     - 0.954
     - 0.024
   * - 0.8
     - 0.984
     - 0.916
   * - 1.0
     - 0.990
     - 0.955
   * - 1.5
     - 0.996
     - 0.983

The ``sigma = 0.5`` row is the run printed above. Losing grip is not gradual:
the agent holds ``r`` below about 0.1 for every ``sigma`` up to 0.5, mostly
between 0.01 and 0.03 but rising to 0.099 at ``sigma = 0.45``, then fails
between 0.5 and 0.8, where ``r`` jumps from 0.024 to 0.916.

By ``sigma = 1.5`` one agent kicking one node at a time cannot keep up with 500
oscillators pulling on each other: it removes only one to two percent of the
order parameter, a gap of 0.012 to 0.019 across four seed pairs. Small, but
perfectly reproducible rather than lost in noise, since the agent-free run
locks at 0.9955 for every seed and leaves no scatter for the effect to hide in.
For a visible effect at higher coupling, raise ``beta``.

That last row also sits on the integrator's limit. This graph has
:math:`\lambda_{\max}(L) = 21.36`, so the explicit Euler step crosses its
stability bound at ``sigma`` = 1.50 and the ``sigma = 1.5`` row has no margin
left. The printed value is unaffected: refining ``dt`` 8x gives 0.995549 either
way, identical to six decimals. It is the margin that is exhausted, not the
accuracy, so pushing ``sigma`` higher here, or running the same ``sigma`` on a
graph with a larger :math:`\lambda_{\max}`, would degrade the number. See
:doc:`guide_dynamics` for the rule.

Strength and speed enter together
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The agent has two knobs: how hard it kicks (:math:`\alpha`, ``strength``) and
how fast it hops (:math:`\beta`, ``beta``, which sets ``speed`` as a fraction
of the network size). A remarkable degeneracy hides in them, since a weak, fast
agent and a strong, slow one behave identically as long as :math:`\alpha\beta`
matches. Watch the two collapse onto each other::

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
each other than either is to it. That product is exactly the ``ab`` you hand to
:class:`~pyGD.dynamics.KuramotoCG`, which remembers the agent only through it.
Run the comparison where the agent still has authority: once ``sigma`` is high
enough that neither agent moves ``r``, the two numbers agree only because both
are doing nothing.

Blinding the sensor
^^^^^^^^^^^^^^^^^^^

Because the agent must measure before it acts, you can ask what its
measurements are worth by corrupting them. The ``noise`` parameter
(:math:`\eta`, from 0 to 1) blurs its read of the local mean field; at
:math:`\eta = 1` it kicks blind::

    env = Kuramoto(0.5, G, omegas, rng=np.random.default_rng(5))
    yok = Yokai(0.5, 0.16, env, noise=0.5, rng=np.random.default_rng(6))

Sweep ``noise`` from 0 to 1 and measure how much desynchronization survives.
Averaged over eight runs on the graph above, seeded as the pair just shown and
then continued (environment ``default_rng(k)``, agent ``default_rng(k+1)``, for
odd ``k`` from 5 to 19), ``r`` runs 0.06, 0.05, 0.39, 0.88, 0.91 as
:math:`\eta` takes 0, 0.25, 0.5, 0.75, 1. Read the middle entry as a marker
rather than a value: :math:`\eta = 0.5` is the transition itself, where five of
the eight runs land below 0.2 and the other three above 0.78, none of them near
their own average. That mean is a mixing ratio and moves with the seeds you
pick. Either side of it the outcome is sharp. The agent keeps its grip while
its measurement is roughly right and loses it entirely once the read is
worthless, and the kicks never changed size, only their aim.

Whether corrupting the agent's information costs it its grip depends on the
graph, and that dependence is the paper's central result. The theory page
states it; the paper proves it\ :footcite:`sowinski2024information`.

References
^^^^^^^^^^

.. footbibliography::
