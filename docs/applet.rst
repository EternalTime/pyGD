Applet
======

.. raw:: html

   <link rel="stylesheet" href="_static/gd_applet.css">
   <div id="gd-app"></div>
   <script src="_static/gd_applet.js"></script>

The library, running live in your browser. The dynamics are the same ones
pyGD integrates in Python — the Euler step of :class:`pyGD.dynamics.Kuramoto`,
the measure–kick–hop loop of :class:`pyGD.agents.Yokai`, and the
Euler–Maruyama step of :class:`pyGD.dynamics.KuramotoCG` — ported line for
line from the modules they document. Nothing is precomputed: the stage is an
Erdős–Rényi graph\ :footcite:`erdos1959` of 500 oscillators, laid out once by
a spring embedding and then frozen, being integrated as you watch.

The applet is yours to take apart. It ships with the library as
`docs/_static/gd_applet.js
<https://github.com/EternalTime/pyGD/blob/main/docs/_static/gd_applet.js>`_:
557 lines of plain JavaScript with no build step and no dependencies, of
which the first part is the library itself — the local field, the two
integrators, and the agent, function for function. The rest is scenery.

Each node is colored by its phase on a cyclic wheel — light gray at
:math:`\theta = 0`, crimson at :math:`+\pi/2`, near-black at :math:`\pi`,
slate at :math:`-\pi/2` — and the rose plot doubles as the wheel's legend:
it is the histogram of phases on the unit circle, each wedge filled with its
own bin's color, with the order parameter :math:`Z` drawn as the gray arrow
whose length is :math:`r`. Slide the coupling :math:`\sigma` through the
synchronization transition and watch the mottle of all four colors organize
into traveling waves and then a single consensus hue, the histogram
sharpening from a ring into a spike as :math:`r` climbs.

Then switch on the Yokai. The gray ring is the agent, hopping node to node
:math:`\lceil \beta N \rceil` times per environment step, reading the local
mean field of each node's neighbors, and kicking the phase by
:math:`\pm\alpha` against local synchrony. At the default settings a
coupling that holds the bare environment near :math:`r \approx 0.9` is
driven to the incoherent floor — one node at a time, faster than the
environment can heal. The sensor noise :math:`\eta` is the interesting
dial: it corrupts only the agent's *measurement*, not its kick, and as it
grows the informed kick degrades toward an unbiased coin flip. At
:math:`\eta = 1` the same :math:`\alpha` and :math:`\beta` barely dent the
order parameter — what desynchronizes the graph is not the perturbation but
the information in it, which is the Maxwell's-demon reading of the
paper\ :footcite:`sowinski2024information`.

The third mode is the demon integrated out. :class:`~pyGD.dynamics.KuramotoCG`
replaces the hopping agent with what survives coarse-graining — a
degree-modulated shift of the natural frequencies plus a Wiener fluctuation —
and the two agent parameters collapse into their product :math:`\alpha\beta`.
Set the drive to match the product from the second mode and compare the
:math:`r(t)` traces: what survives coarse-graining is the agent's average
drift and fluctuation, not its targeting, and the comparison shows directly
how much of the suppression was targeting.

References
^^^^^^^^^^

.. footbibliography::
