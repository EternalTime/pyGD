"""Agents that act on graph dynamics.

:class:`Yokai`
    The mobile feedback-control agent of Sowinski, Frank & Ghoshal, PRR 6,
    043188 (2024). It hops node-to-node on the graph, estimates the local mean
    field at each node it visits, and kicks that oscillator's phase to oppose
    local synchrony -- a Maxwell's-demon-style desynchronizer. Ported from
    ``Yokai.m``; ``evolve`` mutates the passed environment in place, matching
    the MATLAB handle-class semantics.
"""

import numpy as np


class Yokai:
    """A localized, mobile perturbation living on a Kuramoto environment.

    Ported from ``Yokai.m``. Per environment step the agent performs ``speed``
    sub-steps; in each it estimates the neighborhood mean-field angle at its
    current node, kicks the node's phase by ``+/- strength`` (opposing the sign
    of ``sin(theta_loc - phi_est)``), then hops to a uniformly random neighbor.

    Parameters
    ----------
    strength : float
        Kick magnitude (alpha), applied with sign ``sign(sin(theta - phi_est))``.
    beta : float
        Hop-speed parameter; ``speed = max(1, ceil(beta * env.N))`` sub-steps
        per environment step.
    env : Kuramoto
        The environment the agent lives on (used here to size ``speed`` and to
        pick the initial location).
    noise : float, optional
        Sensor noise (eta) in [0, 1]. When > 0 the mean-field estimate is
        perturbed by ``noise * (2*U - 1) * pi``. Default 0.
    rng : numpy.random.Generator, optional
        Random source; defaults to ``numpy.random.default_rng()``.

    Attributes
    ----------
    speed : int
        Number of sub-steps per environment step.
    loc : int
        Current node index.
    T : float
        Accumulated agent time (incremented by ``env.dt`` each :meth:`evolve`).

    Examples
    --------
    >>> import networkx as nx, numpy as np
    >>> from pyGD.dynamics import Kuramoto
    >>> G = nx.erdos_renyi_graph(50, 0.1, seed=0)
    >>> rng = np.random.default_rng(0)
    >>> env = Kuramoto(0.5, G, rng.standard_normal(50), rng=rng)
    >>> yok = Yokai(0.5, 0.16, env, rng=rng)
    >>> for _ in range(10):
    ...     _ = yok.evolve(env)
    ...     _ = env.evolve()
    >>> bool(0 <= yok.loc < env.N)
    True
    """

    def __init__(self, strength, beta, env, noise=0.0, rng=None):
        self.rng = rng if rng is not None else np.random.default_rng()
        self.strength = float(strength)
        self.beta = float(beta)
        self.speed = max(1, int(np.ceil(beta * env.N)))
        self.noise = float(noise)
        self.loc = int(self.rng.integers(env.N))
        self.T = 0.0

    def evolve(self, env):
        """Advance the agent over one environment step, mutating ``env``.

        Performs ``speed`` measure-kick-hop sub-steps on ``env.thetas``.
        """
        self.T += env.dt
        for _ in range(self.speed):
            nbd = env.neighbors(self.loc)
            if len(nbd) > 0:
                phi_est = np.angle(np.mean(np.exp(1j * env.thetas[nbd])))
            else:
                phi_est = 0.0
            if self.noise > 0:
                phi_est = phi_est + self.noise * (2 * self.rng.random() - 1) * np.pi
            dphi = np.sign(np.sin(env.thetas[self.loc] - phi_est))
            env.thetas[self.loc] = (
                np.mod(env.thetas[self.loc] + self.strength * dphi + np.pi,
                       2 * np.pi) - np.pi
            )
            if len(nbd) > 1:
                self.loc = int(self.rng.choice(nbd))
            elif len(nbd) == 1:
                self.loc = int(nbd[0])
            else:
                self.loc = int(self.rng.integers(env.N))
        return env
