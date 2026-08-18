"""Validation of the pyGD vertical slice against the MATLAB formulas.

Three kinds of check:

1. Exact single-step (Kuramoto, and Kuramoto+Yokai): recompute the MATLAB
   update independently and assert machine-precision agreement.
2. Statistical (KuramotoCG): the order parameter r rises with coupling sigma
   across a small ensemble -- a coarse sanity check in the spirit of Fig. 5,
   not a bit-for-bit match (the SDE is only an approximate continuum limit).
3. Documentation claims: the README and guide promise the Yokai drives r down
   in a specific regime, and that the explicit Euler step is faithful there.
"""

import numpy as np
import networkx as nx

from pyGD.dynamics import Kuramoto, KuramotoCG
from pyGD.agents import Yokai


def _wrap(x):
    return np.mod(x + np.pi, 2 * np.pi) - np.pi


def test_kuramoto_single_step_exact():
    """One Kuramoto.evolve() step matches the hand-computed MATLAB formula."""
    G = nx.erdos_renyi_graph(30, 0.2, seed=1)
    rng = np.random.default_rng(1)
    omegas = rng.standard_normal(G.number_of_nodes())
    env = Kuramoto(0.7, G, omegas, rng=np.random.default_rng(2))

    theta0 = env.thetas.copy()
    A = env.A
    Z = np.exp(1j * theta0)
    krexp = (A @ Z) * np.conj(Z)
    expected = _wrap(theta0 + env.dt * (env.omegas + env.sigma * np.imag(krexp)))

    env.evolve()
    assert np.allclose(env.thetas, expected, atol=1e-12, rtol=0)


def test_yokai_single_step_exact():
    """One Yokai.evolve() sub-step sequence matches the MATLAB kick+hop."""
    G = nx.erdos_renyi_graph(40, 0.2, seed=3)
    env = Kuramoto(0.5, G, np.zeros(G.number_of_nodes()),
                   rng=np.random.default_rng(4))

    # Replay the agent with a cloned RNG stream and reproduce each kick.
    yok = Yokai(0.5, 0.1, env, noise=0.0, rng=np.random.default_rng(7))
    ref_rng = np.random.default_rng(7)
    # __init__ already consumed one integers() draw for loc; mirror it.
    loc = int(ref_rng.integers(env.N))
    theta = env.thetas.copy()

    for _ in range(yok.speed):
        nbd = env.neighbors(loc)
        phi_est = np.angle(np.mean(np.exp(1j * theta[nbd]))) if len(nbd) else 0.0
        dphi = np.sign(np.sin(theta[loc] - phi_est))
        theta[loc] = _wrap(theta[loc] + yok.strength * dphi)
        if len(nbd) > 1:
            loc = int(ref_rng.choice(nbd))
        elif len(nbd) == 1:
            loc = int(nbd[0])
        else:
            loc = int(ref_rng.integers(env.N))

    yok.evolve(env)
    assert np.allclose(env.thetas, theta, atol=1e-12, rtol=0)
    assert env.thetas is not None


def test_kuramotocg_statistical_monotone():
    """KuramotoCG: mean r at high sigma exceeds mean r at low sigma."""
    G = nx.erdos_renyi_graph(200, 0.05, seed=5)
    N = G.number_of_nodes()

    def mean_r(sigma, seed):
        rng = np.random.default_rng(seed)
        omegas = rng.standard_normal(N)
        env = KuramotoCG(sigma, G, omegas, ab=0.08, rng=rng)
        env.run(400)
        rs = env.run(200, record=True)
        return rs.mean()

    low = np.mean([mean_r(0.02, s) for s in range(4)])
    high = np.mean([mean_r(1.5, s) for s in range(4)])
    assert high > low


# The regime the README quick start and docs/guide_yokai.rst advertise.
DOC_SIGMA = 0.5
DOC_STRENGTH = 0.5
DOC_BETA = 0.16


def _doc_setup(seed):
    G = nx.erdos_renyi_graph(500, 0.02, seed=0)
    omegas = np.random.default_rng(0).standard_normal(G.number_of_nodes())
    return Kuramoto(DOC_SIGMA, G, omegas, rng=np.random.default_rng(seed))


def _run_with_yokai(env, steps, seed):
    yok = Yokai(DOC_STRENGTH, DOC_BETA, env, rng=np.random.default_rng(seed))
    for _ in range(steps):
        yok.evolve(env)
        env.evolve()
    env.update_order_parameter()
    return env.r


def test_yokai_lowers_order_parameter_in_documented_regime():
    """The docs' headline claim: at sigma=0.5 the agent drives r from ~0.95 to ~0.05.

    Guards the README quick start, whose earlier sigma=2.0 setting left the
    agent with too little authority to move r at all.
    """
    for seed in range(4):
        free = _doc_setup(seed).run(600, record=True)[-1]
        with_agent = _run_with_yokai(_doc_setup(seed), 600, 100 + seed)
        assert free > 0.9, f"seed {seed}: bare environment failed to lock (r={free})"
        assert with_agent < 0.3, f"seed {seed}: agent left r={with_agent}"
        assert free - with_agent > 0.5, f"seed {seed}: gap only {free - with_agent}"


def test_documented_regime_is_within_euler_stability():
    """The bare sigma=0.5 result must not be an artifact of the default dt.

    At sigma=2.0 the same graph integrates to r=0.94 with dt=1/16 but 0.997
    with dt refined 8x; the documented regime has to be free of that error.
    """
    coarse = _doc_setup(0).run(600, record=True)[-100:].mean()

    G = nx.erdos_renyi_graph(500, 0.02, seed=0)
    omegas = np.random.default_rng(0).standard_normal(G.number_of_nodes())
    fine_env = Kuramoto(DOC_SIGMA, G, omegas, dt=0.0625 / 8,
                        rng=np.random.default_rng(0))
    fine = fine_env.run(4800, record=True)[-800:].mean()

    assert abs(coarse - fine) < 0.01, (
        f"default dt is not faithful at sigma={DOC_SIGMA}: "
        f"{coarse} vs refined {fine}"
    )


if __name__ == "__main__":
    test_kuramoto_single_step_exact()
    test_yokai_single_step_exact()
    test_kuramotocg_statistical_monotone()
    test_yokai_lowers_order_parameter_in_documented_regime()
    test_documented_regime_is_within_euler_stability()
    print("all slice validation checks passed")
