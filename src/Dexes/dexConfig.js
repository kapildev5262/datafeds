import { ethers } from "ethers";

const checksumAddress = (address) => {
  try {
    return ethers.getAddress(address.toLowerCase());
  } catch (error) {
    console.warn(`Invalid address: ${address}`);
    return null;
  }
};

const RPC_URLS = {
  arbitrum: "https://arb-mainnet.g.alchemy.com/v2/gc8LPqeXM7ZGja289ivR7YoerEUSEDLF",
  avalanche: "https://api.avax.network/ext/bc/C/rpc",
  base: "https://mainnet.base.org",
  bnb: "https://bsc-dataseed.binance.org/",
  ethereum: "https://eth-mainnet.g.alchemy.com/v2/iIks_aShfkGOF8-Nl658iTVe9kxC62jM"
};

const CHAIN_IDS = {
  arbitrum: 42161,
  avalanche: 43114,
  base: 8453,
  bnb: 56,
  ethereum: 1
};

const dexConfig = {
  chainIds: CHAIN_IDS,
  rpcUrls: RPC_URLS,
  
  arbitrum: {
    bnb: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    usd: {
      usdt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      dai: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" 
    },
    dexes: {
      sushiSwap: {
        router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
      },
      camelot: { 
        router: "0xc873fEcbd354f5A56E00E710B90EF4201db2448d"
      }
    }
  },

  avalanche: {
    bnb: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", 
    usd: {
      usdt: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4a8c7",
      usdc: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      dai: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70" 
    },
    dexes: {
      traderJoe: {
        router: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4"
      },
      pangolin: {
        router: "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106"
      },
      sushiSwap: {
        router: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
      }
    }
  },

  bnb: {
    bnb: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    usd: {
      usdt: "0x55d398326f99059fF775485246999027B3197955",
      usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      busd: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
    },
    dexes: {
      pancakeSwap: {
        router: "0x10ED43C718714eb63d5aA57B78B54704E256024E"
      },
      apeSwap: {
        router: "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7"
      },
      sushiSwap: {
        router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
      }
    }
  },

  ethereum: {
    bnb: "0x418D75f65a02b3D53B2418FB8E1fe493759c7605", 
    usd: {
      usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    },
    dexes: {
      uniSwap: {
        router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
      },
      sushiSwap: {
        router: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
      }
    }
  }
};

const normalizeConfiguration = (config) => {
  Object.keys(config).forEach((chainKey) => {
    if (chainKey !== "rpcUrls" && chainKey !== "chainIds") {
      // Normalize blockchain-level addresses
      config[chainKey].bnb = checksumAddress(config[chainKey].bnb);
      
      // Normalize USD token addresses
      if (config[chainKey].usd) {
        Object.keys(config[chainKey].usd).forEach((usdTokenKey) => {
          config[chainKey].usd[usdTokenKey] = checksumAddress(config[chainKey].usd[usdTokenKey]);
        });
      }
      
      // Normalize DEX router addresses
      if (config[chainKey].dexes) {
        Object.keys(config[chainKey].dexes).forEach((dexName) => {
          const dexConfig = config[chainKey].dexes[dexName];
          if (dexConfig.router) {
            dexConfig.router = checksumAddress(dexConfig.router);
          }
        });
      }

      config[chainKey].rpcUrl = RPC_URLS[chainKey] || null;
    }
  });

  return config;
};

export default normalizeConfiguration(dexConfig);