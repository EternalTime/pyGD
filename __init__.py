"""pyGD -- graph dynamics.

A Python port of the MATLAB Kuramoto / Yokai model. Dynamics run on
:mod:`networkx` graphs; the sparse adjacency matrix is the contract handed to
every dynamics.

Vertical slice
--------------
- :class:`~pyGD.dynamics.Kuramoto` -- oscillator environment (Eq. 1).
- :class:`~pyGD.dynamics.KuramotoCG` -- coarse-grained stochastic variant (Eq. 7).
- :class:`~pyGD.agents.Yokai` -- mobile feedback-control desynchronizing agent.
"""

from pyGD.dynamics import Kuramoto, KuramotoCG
from pyGD.agents import Yokai

__all__ = ["Kuramoto", "KuramotoCG", "Yokai"]
