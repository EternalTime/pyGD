"""Continuous phase dynamics on graphs.

This module ports the MATLAB ``Kuramoto`` and ``KuramotoCG`` classes to Python.
Both consume a :class:`networkx.Graph` directly; the adjacency matrix is pulled
once as a SciPy sparse (CSR) matrix and the hot loop is the sparse mat-vec
``A @ exp(i*theta)``, mirroring the MATLAB ``G.adjacency`` multiply.

:class:`Kuramoto`
    The base environment, Eq. (1) of Sowinski, Frank & Ghoshal, PRR 6, 043188
    (2024): ``dtheta_i/dt = omega_i + sigma * sum_j A_ij sin(theta_j - theta_i)``.
:class:`KuramotoCG`
    The coarse-grained stochastic variant, Eq. (7): the intervening agent is
    integrated out (Appendix B) into a degree-modulated frequency shift plus a
    Wiener fluctuation. Kept as an independent class, mirroring the MATLAB.
"""

import numpy as np
import networkx as nx


def _adjacency_csr(G):
    """Return (nodelist, CSR adjacency) with a fixed node ordering."""
    nodelist = list(G.nodes())
    A = nx.to_scipy_sparse_array(G, nodelist=nodelist, format="csr", dtype=float)
    return nodelist, A


class Kuramoto:
    """Kuramoto oscillators on the nodes of a graph.

    Ported from ``Kuramoto.m``. Each node carries a phase ``theta_i``; the
    global order parameter is ``Z = mean(exp(i*theta))`` with magnitude ``r``
    and mean phase ``phi``. The per-node complex local field is
    ``krexp = (A @ exp(i*theta)) * conj(exp(i*theta))``.

    Parameters
    ----------
    sigma : float
        Coupling strength.
    G : networkx.Graph
        Interaction graph. Adjacency is extracted once as sparse CSR.
    omegas : array_like
        Natural frequencies, one per node (node order = ``list(G.nodes())``).
    r0 : float, optional
        Initial spread of phases; ``theta = (2*U - 1)*pi*(1 - r0)`` with
        ``U ~ Uniform[0,1)``. ``r0 = 0`` gives fully random phases (default).
    dt : float, optional
        Timestep. Default 0.0625 (= 1/16), matching the MATLAB.
    rng : numpy.random.Generator, optional
        Random source; defaults to ``numpy.random.default_rng()``.

    Attributes
    ----------
    thetas : ndarray
        Current phases, wrapped to (-pi, pi].
    Z, r, phi : complex, float, float
        Global order parameter, its magnitude, and its angle.
    krexp : ndarray
        Complex per-node local field (updated by :meth:`compute_mean_field`).
    word : ndarray
        Sign bits of ``imag(krexp)`` via Heaviside (0.5 at exactly 0),
        matching the MATLAB ``compute_word``.

    Examples
    --------
    >>> import networkx as nx, numpy as np
    >>> G = nx.erdos_renyi_graph(50, 0.1, seed=0)
    >>> rng = np.random.default_rng(0)
    >>> env = Kuramoto(0.5, G, rng.standard_normal(G.number_of_nodes()), rng=rng)
    >>> env.run(10)
    >>> bool(0.0 <= env.r <= 1.0)
    True
    """

    def __init__(self, sigma, G, omegas, r0=0.0, dt=0.0625, rng=None):
        self.rng = rng if rng is not None else np.random.default_rng()
        self.G = G
        self.nodelist, self.A = _adjacency_csr(G)
        self.N = self.A.shape[0]
        self.omegas = np.asarray(omegas, dtype=float).ravel()
        self.sigma = float(sigma)
        self.dt = float(dt)

        self.thetas = (2 * self.rng.random(self.N) - 1) * np.pi * (1 - r0)
        self.krexp = np.zeros(self.N, dtype=complex)
        self.update_order_parameter()

    def compute_mean_field(self):
        """Recompute the complex per-node local field ``krexp``."""
        Z = np.exp(1j * self.thetas)
        self.krexp = (self.A @ Z) * np.conj(Z)
        return self

    def compute_word(self):
        """Recompute the sign-bit ``word`` from ``imag(krexp)``."""
        self.word = np.heaviside(np.imag(self.krexp), 0.5)
        return self

    def update_order_parameter(self):
        """Refresh ``Z``, ``r``, ``phi`` and recompute mean field + word."""
        self.Z = np.mean(np.exp(1j * self.thetas))
        self.r = np.abs(self.Z)
        self.phi = np.angle(self.Z)
        self.compute_mean_field()
        self.compute_word()
        return self

    def evolve(self):
        """Advance one Euler step. Mirrors the MATLAB ``evolve`` exactly."""
        self.compute_mean_field()
        self.thetas = self.thetas + self.dt * (
            self.omegas + self.sigma * np.imag(self.krexp)
        )
        self.thetas = np.mod(self.thetas + np.pi, 2 * np.pi) - np.pi
        return self

    def run(self, n_steps, record=False):
        """Advance ``n_steps`` steps.

        Parameters
        ----------
        n_steps : int
            Number of steps.
        record : bool, optional
            If True, call :meth:`update_order_parameter` each step and return
            the array of ``r`` values. Default False (faster; no measurement).

        Returns
        -------
        ndarray or None
            The ``r`` history if ``record`` else None.
        """
        if not record:
            for _ in range(n_steps):
                self.evolve()
            return None
        hist = np.empty(n_steps)
        for k in range(n_steps):
            self.evolve()
            self.update_order_parameter()
            hist[k] = self.r
        return hist

    def neighbors(self, i):
        """Neighbor node indices of ``i`` from the CSR adjacency."""
        start, end = self.A.indptr[i], self.A.indptr[i + 1]
        return self.A.indices[start:end]

    def plot_phases(self, ax=None, pos=None, cmap="twilight"):
        """Draw the graph with nodes colored by phase (viz helper).

        Requires matplotlib. Uses a spring layout unless ``pos`` is given.
        """
        import matplotlib.pyplot as plt

        if ax is None:
            _, ax = plt.subplots()
        if pos is None:
            pos = nx.spring_layout(self.G, seed=0)
        nx.draw_networkx_edges(self.G, pos, ax=ax, alpha=0.2)
        nx.draw_networkx_nodes(
            self.G, pos, ax=ax, node_color=self.thetas, cmap=cmap,
            vmin=-np.pi, vmax=np.pi, node_size=40,
        )
        ax.set_axis_off()
        ax.set_title(f"r = {self.r:.3f}")
        return ax


class KuramotoCG:
    """Coarse-grained (stochastic) Kuramoto dynamics, Eq. (7).

    Ported from ``KuramotoCG.m``. The intervening agent is integrated out into
    (i) a degree-modulated shift of the natural frequencies and (ii) a Wiener
    fluctuation whose amplitude scales with node degree. See Appendix B of the
    paper; the two agent parameters enter only through their product ``ab`` (=
    alpha*beta). This is the continuum limit of a :class:`Kuramoto` environment
    driven by a Yokai agent, but is kept as an independent class.

    Parameters
    ----------
    sigma : float
        Coupling strength.
    G : networkx.Graph
        Interaction graph.
    omegas : array_like
        Base natural frequencies, one per node.
    ab : float
        The product alpha*beta (kick strength times hop speed).
    dt : float, optional
        Timestep. Default 0.0625.
    rng : numpy.random.Generator, optional
        Random source; defaults to ``numpy.random.default_rng()``.

    Attributes
    ----------
    thetas, Z, r, phi, krexp, word
        As in :class:`Kuramoto`.
    fluc : ndarray
        Per-node fluctuation amplitude ``sqrt(dt * ab * deg/mean(deg))``.
    """

    def __init__(self, sigma, G, omegas, ab, dt=0.0625, rng=None):
        self.rng = rng if rng is not None else np.random.default_rng()
        self.G = G
        self.nodelist, self.A = _adjacency_csr(G)
        self.N = self.A.shape[0]
        self.sigma = float(sigma)
        self.dt = float(dt)
        self.ab = float(ab)

        deg = np.asarray(self.A.sum(axis=1)).ravel()
        meandeg = deg.mean()
        omegas = np.asarray(omegas, dtype=float).ravel()
        omegas = omegas + ab * np.sign(omegas) * deg / meandeg
        self.omegas = omegas - omegas.mean()
        self.fluc = np.sqrt(self.dt * ab * deg / meandeg)

        self.thetas = (2 * self.rng.random(self.N) - 1) * np.pi
        self.krexp = np.zeros(self.N, dtype=complex)
        self.update_order_parameter()

    def compute_mean_field(self):
        """Recompute the complex per-node local field ``krexp``."""
        Z = np.exp(1j * self.thetas)
        self.krexp = (self.A @ Z) * np.conj(Z)
        return self

    def compute_word(self):
        """Recompute the sign-bit ``word`` from ``imag(krexp)``."""
        self.word = np.heaviside(np.imag(self.krexp), 0.5)
        return self

    def update_order_parameter(self):
        """Refresh ``Z``, ``r``, ``phi`` and recompute mean field + word."""
        self.Z = np.mean(np.exp(1j * self.thetas))
        self.r = np.abs(self.Z)
        self.phi = np.angle(self.Z)
        self.compute_mean_field()
        self.compute_word()
        return self

    def evolve(self):
        """Advance one Euler-Maruyama step. Mirrors the MATLAB ``evolve``."""
        self.compute_mean_field()
        self.thetas = (
            self.thetas
            + self.dt * (self.omegas + self.sigma * np.imag(self.krexp))
            + self.fluc * self.rng.standard_normal(self.N)
        )
        self.thetas = np.mod(self.thetas + np.pi, 2 * np.pi) - np.pi
        return self

    def run(self, n_steps, record=False):
        """Advance ``n_steps`` steps. See :meth:`Kuramoto.run`."""
        if not record:
            for _ in range(n_steps):
                self.evolve()
            return None
        hist = np.empty(n_steps)
        for k in range(n_steps):
            self.evolve()
            self.update_order_parameter()
            hist[k] = self.r
        return hist
