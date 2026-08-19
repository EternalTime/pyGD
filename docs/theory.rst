The Model
=========

This page is a compact reference for the equations pyGD integrates. The full
development - the information-theoretic reading, the viability measure, and the
semantic threshold - is in Sowinski, Frank & Ghoshal, *Phys. Rev. Research*
**6**, 043188 (2024)\ :footcite:`sowinski2024information`.

The environment
---------------

The environment is a population of :math:`N` Kuramoto phase
oscillators\ :footcite:`kuramoto1975` on the nodes of a graph with adjacency
matrix :math:`A`. Each oscillator turns at its own natural
frequency :math:`\omega_i` and is pulled toward its neighbors,

.. math::

   \frac{d\theta_i}{dt} = \omega_i + \sigma \sum_{j} A_{ij}\,\sin(\theta_j - \theta_i),

with coupling :math:`\sigma`. The frequencies are standardized to zero mean and
unit variance, and time is measured in units of the root-mean-square frequency.
:class:`~pyGD.dynamics.Kuramoto` steps this with an explicit Euler update of
timestep ``dt``.

Synchronization is read off the global order parameter

.. math::

   Z = r\,e^{i\phi} = \frac{1}{N}\sum_j e^{i\theta_j},

whose magnitude :math:`r` measures phase coherence: near 0 for scattered
phases, near 1 for a locked population. Above a critical coupling
:math:`\sigma_c` an extensive fraction of the oscillators locks and :math:`r`
becomes nonzero\ :footcite:`strogatz2000`.

The agent
---------

The Yokai occupies one node at a time. At node :math:`i` it estimates the local
mean-field angle :math:`\hat\phi_i` from the neighbors' phases and kicks its own
phase to oppose the local alignment,

.. math::

   \theta_i \mapsto \theta_i + \alpha\,\kappa_i,
   \qquad
   \kappa_i = \operatorname{sign}\big(\sin(\theta_i - \hat\phi_i)\big),

then hops to a uniformly chosen neighbor. Its strength :math:`\alpha` and hop
rate :math:`\beta` enter all observables only through the product
:math:`\alpha\beta`.

The coarse-grained limit
------------------------

Averaging the agent's rare, degree-biased visits into a continuous drift plus a
fluctuation turns the driven environment into a stochastic Kuramoto equation,

.. math::

   \frac{d\theta_i}{dt} = \omega_i + \sigma \sum_j A_{ij}\,\sin(\theta_j - \theta_i)
   + \alpha\beta\,\frac{k_i}{\langle k \rangle}\,\kappa_i
   + \sqrt{\alpha\beta\,\frac{k_i}{\langle k \rangle}}\;\frac{dW_i}{dt},

where :math:`k_i` is the degree of node :math:`i` and :math:`W_i` a Wiener
process. The second added term is a degree-weighted shift of the natural
frequency; the third is a heat bath whose temperature scales with degree, so
that hubs fluctuate more than leaves. This is what
:class:`~pyGD.dynamics.KuramotoCG` integrates, with ``ab`` :math:`= \alpha\beta`.

The continuum model reproduces the agent-based order parameter closely but not
exactly - it slightly underestimates the synchronization - and pyGD keeps the
two as independent classes for that reason. Appendix B of the paper derives the
drift and diffusion coefficients.

References
^^^^^^^^^^

.. footbibliography::
