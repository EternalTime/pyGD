pyGD
====

pyGD runs the Kuramoto model of coupled phase oscillators and lets you
interfere with it. The oscillators live on the nodes of a graph, each pulled
toward the phases of its neighbors; turn up the coupling and they synchronize.
On top of them lives an agent - the *Yokai* - that hops from node to node,
reads the local mean field, and kicks each phase it visits against the
alignment it finds there.

:class:`~pyGD.dynamics.Kuramoto` is the environment;
:class:`~pyGD.agents.Yokai` is the agent that drives it out of step;
:class:`~pyGD.dynamics.KuramotoCG` is the continuum limit you reach when the
agent is integrated out. Graphs come from :mod:`networkx`, and the dynamics
only ever see the sparse adjacency matrix. The library ports a set of MATLAB
classes, whose interface it keeps.

The model and the information-theoretic reading of the agent are in Sowinski,
Frank & Ghoshal, *Phys. Rev. Research* **6**,
043188 (2024)\ :footcite:`sowinski2024information`. Start with
:doc:`getting_started`, take the model for a spin in the :doc:`applet`, then
read whichever guide matches your problem.

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

Citing
^^^^^^

Sowinski DR. *pyGD* [computer software]. Version 0.1.0. 2026. Accessed July 21, 2026. https://github.com/EternalTime/pyGD

.. code-block:: bibtex

   @software{sowinski_pygd,
     author  = {Sowinski, Damian R.},
     title   = {pyGD: Kuramoto dynamics on graphs with a desynchronizing agent},
     year    = {2026},
     version = {0.1.0},
     url     = {https://github.com/EternalTime/pyGD}
   }

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`

References
^^^^^^^^^^

.. footbibliography::
