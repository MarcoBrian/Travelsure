import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { createConfig, http } from "wagmi";
import { sepolia, arbitrumSepolia, polygonMumbai, optimismSepolia, baseSepolia , hardhat } from "wagmi/chains";
import { 
  metaMaskWallet,
  walletConnectWallet,
  injectedWallet
} from "@rainbow-me/rainbowkit/wallets";

// Ensure a single instance across HMR in dev
const globalAny = globalThis as unknown as { __wagmiConfig?: any };

// Create custom wallet connectors
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
  {
    appName: 'Travelsure',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  }
);

export const wagmiConfig =
  globalAny.__wagmiConfig ||
  (globalAny.__wagmiConfig = createConfig({
    chains: [sepolia, arbitrumSepolia, baseSepolia, hardhat],
    connectors,
    transports: {
      [sepolia.id]: http(
        (process.env.NEXT_PUBLIC_ALCHEMY_KEY
          ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`
          : undefined) || process.env.NEXT_PUBLIC_RPC_SEPOLIA ||
          "https://eth-sepolia.public.blastapi.io"
      ),
      [arbitrumSepolia.id]: http(
        (process.env.NEXT_PUBLIC_ALCHEMY_KEY
          ? `https://arb-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`
          : undefined) || process.env.NEXT_PUBLIC_RPC_ARBITRUM_SEPOLIA ||
          "https://sepolia-rollup.arbitrum.io/rpc"
      ),
      [baseSepolia.id]: http(
        (process.env.NEXT_PUBLIC_ALCHEMY_KEY
          ? `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`
          : undefined) || process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ||
          "https://sepolia.base.org"
      ),
      [hardhat.id]: http("http://127.0.0.1:8545"),
    },
  }));


