// ============================================================
// AuthBridge — imperative singleton that bridges React (Privy hooks)
// and non-React code (Phaser scenes, GameAPI HTTP client).
//
// Only a React component (BridgeSync) populates the bridge;
// everyone else consumes via the frozen methods below.
// ============================================================

const state = {
  ready: false,
  authenticated: false,
  walletAddress: null,
  accessToken: null,             // Privy JWT — sent as Bearer to the backend
  solanaCluster: null,
  solanaRpcUrl: null,

  // Filled by React: async (txOrInstructions, opts) => txSignature
  _signAndSend: null,
  // Filled by React: async () => updated accessToken (handles refresh)
  _getAccessToken: null,
  // Filled by React: () => void
  _login: null,
  _logout: null,
  _openWalletFunding: null,
};

const listeners = new Set();
function notify() { for (const l of listeners) l(snapshot()); }
function snapshot() {
  return {
    ready: state.ready,
    authenticated: state.authenticated,
    walletAddress: state.walletAddress,
  };
}

export const AuthBridge = {
  // ---- subscription ----
  subscribe(fn) { listeners.add(fn); fn(snapshot()); return () => listeners.delete(fn); },
  getSnapshot() { return snapshot(); },

  // ---- setters (React-side only) ----
  _setReady(v) { state.ready = v; notify(); },
  _setAuth(auth, walletAddress) {
    state.authenticated = auth;
    state.walletAddress = walletAddress;
    notify();
  },
  _setAccessToken(tok) { state.accessToken = tok; },
  _setSolana(cluster, rpcUrl) { state.solanaCluster = cluster; state.solanaRpcUrl = rpcUrl; },
  _setHandlers({ signAndSend, getAccessToken, login, logout, openWalletFunding }) {
    state._signAndSend = signAndSend;
    state._getAccessToken = getAccessToken;
    state._login = login;
    state._logout = logout;
    state._openWalletFunding = openWalletFunding;
  },

  // ---- getters (consumers) ----
  isReady()         { return state.ready; },
  isAuthenticated() { return state.authenticated; },
  walletAddress()   { return state.walletAddress; },

  async getAccessToken() {
    if (state._getAccessToken) {
      const tok = await state._getAccessToken();
      state.accessToken = tok;
      return tok;
    }
    return state.accessToken;
  },

  solanaRpcUrl()    { return state.solanaRpcUrl; },
  solanaCluster()   { return state.solanaCluster; },

  // ---- actions (consumers) ----
  login()           { state._login?.(); },
  logout()          { state._logout?.(); },
  openWalletFunding() { state._openWalletFunding?.(); },

  // Sign + send a Solana Transaction (or VersionedTransaction).
  // Returns the tx signature string once submitted.
  async signAndSend(tx) {
    if (!state._signAndSend) throw new Error('AuthBridge: signer not registered');
    if (!state.authenticated) throw new Error('AuthBridge: not authenticated');
    return state._signAndSend(tx);
  },
};
