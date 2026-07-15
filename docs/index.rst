pyGD
====

pyGD runs the Kuramoto model of coupled phase oscillators and lets you
interfere with it. The oscillators live on the nodes of a graph, each pulled
toward the phases of its neighbors; turn up the coupling and they synchronize.
On top of them lives an agent — the *Yokai* — that hops from node to node,
reads the local mean field, and kicks each phase it visits in the direction
that opposes synchrony.

The library ships two dynamics and one agent. :class:`~pyGD.dynamics.Kuramoto`
is the oscillator environment; :class:`~pyGD.agents.Yokai` is the agent that
drives it out of step; :class:`~pyGD.dynamics.KuramotoCG` is the coarse-grained
continuum limit, the stochastic dynamics you reach when the agent is integrated
out. Graphs come from :mod:`networkx`; the dynamics only ever see the sparse
adjacency matrix, so any graph networkx can build is a graph pyGD can run.

The model and the information-theoretic reading of the agent are in Sowinski,
Frank & Ghoshal, *Phys. Rev. Research* **6**, 043188 (2024), linked from the
project page. If you're new here, start with :doc:`getting_started`, take the
model for a spin in the :doc:`applet`, then work through whichever guide
matches your problem. The library ports a set of
MATLAB classes, whose interface it keeps.

Guide
^^^^^

.. toctree::
   :maxdepth: 1

   getting_started
   applet
   guide_dynamics
   guide_yokai
   theory

Reference
^^^^^^^^^

.. toctree::
   :maxdepth: 2

   api/pyGD
   license

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
