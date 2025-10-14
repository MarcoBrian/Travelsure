// Minimal web stub for React Native AsyncStorage
// Provides the API shape expected by MetaMask SDK, no-ops on web

const AsyncStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
  getAllKeys: async () => [],
  multiGet: async () => [],
  multiSet: async () => {},
  multiRemove: async () => {},
};

module.exports = AsyncStorage;

