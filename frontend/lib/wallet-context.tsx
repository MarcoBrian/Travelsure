"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ethers } from 'ethers'

// Network configurations
const SUPPORTED_NETWORKS = {
  sepolia: {
    chainId: '0xaa36a7',
    chainName: 'Sepolia',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://eth-sepolia.public.blastapi.io'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
  },
  arbitrumSepolia: {
    chainId: '0x66eee',
    chainName: 'Arbitrum Sepolia',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://sepolia.arbiscan.io'],
  },
  baseSepolia: {
    chainId: '0x14a34',
    chainName: 'Base Sepolia',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia-explorer.base.org'],
  },
}

interface WalletState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  chainId: string | null
  provider: ethers.providers.Web3Provider | null
  signer: ethers.Signer | null
  error: string | null
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  switchNetwork: (networkKey: keyof typeof SUPPORTED_NETWORKS) => Promise<void>
  isMetaMaskInstalled: boolean
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    provider: null,
    signer: null,
    error: null,
  })

  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false)

  // Check if MetaMask is installed
  useEffect(() => {
    setIsMetaMaskInstalled(typeof window !== 'undefined' && !!window.ethereum?.isMetaMask)
  }, [])

  // Initialize provider and check for existing connection
  useEffect(() => {
    if (!isMetaMaskInstalled) return

    const initializeProvider = async () => {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const accounts = await provider.listAccounts()
        
        if (accounts.length > 0) {
          const signer = provider.getSigner()
          const network = await provider.getNetwork()
          
          setState(prev => ({
            ...prev,
            provider,
            signer,
            address: accounts[0],
            isConnected: true,
            chainId: `0x${network.chainId.toString(16)}`,
          }))
        } else {
          setState(prev => ({
            ...prev,
            provider,
          }))
        }
      } catch (error) {
        console.error('Failed to initialize provider:', error)
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize MetaMask',
        }))
      }
    }

    initializeProvider()
  }, [isMetaMaskInstalled])

  // Listen to account and network changes
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        setState(prev => ({
          ...prev,
          address: null,
          isConnected: false,
          signer: null,
          error: null,
        }))
      } else {
        // User switched accounts
        setState(prev => ({
          ...prev,
          address: accounts[0],
          isConnected: true,
          signer: prev.provider?.getSigner() || null,
          error: null,
        }))
      }
    }

    const handleChainChanged = (chainId: string) => {
      setState(prev => ({
        ...prev,
        chainId,
      }))
      // Reload the page to avoid any issues with the new network
      window.location.reload()
    }

    const handleDisconnect = () => {
      setState(prev => ({
        ...prev,
        address: null,
        isConnected: false,
        signer: null,
        error: null,
      }))
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)
    window.ethereum.on('disconnect', handleDisconnect)

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
      window.ethereum?.removeListener('disconnect', handleDisconnect)
    }
  }, [])

  const connect = async () => {
    if (!isMetaMaskInstalled) {
      setState(prev => ({
        ...prev,
        error: 'MetaMask is not installed. Please install MetaMask to continue.',
      }))
      return
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      error: null,
    }))

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()

      setState(prev => ({
        ...prev,
        provider,
        signer,
        address,
        isConnected: true,
        isConnecting: false,
        chainId: `0x${network.chainId.toString(16)}`,
        error: null,
      }))
    } catch (error: any) {
      console.error('Failed to connect wallet:', error)
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet',
      }))
    }
  }

  const disconnect = () => {
    setState(prev => ({
      ...prev,
      address: null,
      isConnected: false,
      signer: null,
      error: null,
    }))
  }

  const switchNetwork = async (networkKey: keyof typeof SUPPORTED_NETWORKS) => {
    if (!window.ethereum || !isMetaMaskInstalled) {
      setState(prev => ({
        ...prev,
        error: 'MetaMask is not available',
      }))
      return
    }

    const network = SUPPORTED_NETWORKS[networkKey]
    
    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }],
      })
    } catch (switchError: any) {
      // If the network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network],
          })
        } catch (addError: any) {
          setState(prev => ({
            ...prev,
            error: `Failed to add network: ${addError.message}`,
          }))
        }
      } else {
        setState(prev => ({
          ...prev,
          error: `Failed to switch network: ${switchError.message}`,
        }))
      }
    }
  }

  const contextValue: WalletContextType = {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    isMetaMaskInstalled,
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

// Custom hooks
export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

export function useAccount() {
  const { address, isConnected } = useWallet()
  return { address, isConnected }
}

export function useConnect() {
  const { connect, isConnecting, error } = useWallet()
  return { connect, isConnecting, error }
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, handler: (...args: any[]) => void) => void
      removeListener: (event: string, handler: (...args: any[]) => void) => void
    }
  }
}
