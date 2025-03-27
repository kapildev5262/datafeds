import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import dexAbis from './abi';
import dexConfig from './dexConfig';
import './DEXPriceTracker.css';

// API Endpoints
const COINBASE_API = 'https://api.coinbase.com/v2/prices/BNB-USD/spot';
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd';

const DEXPriceTracker = () => {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch price from CoinGecko API
  const fetchCoinGeckoPrice = useCallback(async () => {
    try {
      const response = await fetch(COINGECKO_API);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      return {
        price: data.binancecoin.usd.toFixed(4),
        source: 'CoinGecko',
        blockchain: 'API Reference',
        pair: 'BNB/USD',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('CoinGecko API Error:', err);
      return null;
    }
  }, []);

  // Fetch price from Coinbase API
  const fetchCoinbasePrice = useCallback(async () => {
    try {
      const response = await fetch(COINBASE_API);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      return {
        price: parseFloat(data.data.amount).toFixed(4),
        source: 'Coinbase',
        blockchain: 'API Reference',
        pair: 'BNB/USD',
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('Coinbase API Error:', err);
      return null;
    }
  }, []);

  // Fetch price from DEX
  const fetchDexPrice = useCallback(async (chainId, dexName, provider, chainConfig) => {
    try {
      const nativeTokenAddress = chainConfig.bnb;
      const routerAddress = chainConfig.dexes[dexName]?.router;
      
      if (!nativeTokenAddress || !routerAddress) return null;
  
      const routerAbi = dexAbis[dexName.toLowerCase()] || dexAbis.pancakeswap;
      const router = new ethers.Contract(routerAddress, routerAbi, provider);
  
      // Try stablecoins in order of preference
      const stablecoinPriority = ['usdt', 'usdc', 'busd', 'dai'];
      
      for (const tokenName of stablecoinPriority) {
        const usdAddress = chainConfig.usd[tokenName];
        if (!usdAddress) continue;
  
        try {
          const amountIn = ethers.parseUnits("1", 18);
          const amounts = await router.getAmountsOut(amountIn, [nativeTokenAddress, usdAddress]);
          
          if (amounts?.length >= 2 && amounts[1] > 0) {
            const decimals = tokenName === 'usdc' ? 6 : 18;
            const price = ethers.formatUnits(amounts[1], decimals);
            
            return {
              price: price,
              source: dexName,
              blockchain: chainId.charAt(0).toUpperCase() + chainId.slice(1),
              pair: `${chainId === 'arbitrum' ? 'WETH' : chainId === 'avalanche' ? 'WAVAX' : 'BNB'}/USD`,
              timestamp: new Date().toISOString(),
              stablecoin: tokenName.toUpperCase()
            };
          }
        } catch (err) {
          console.debug(`No liquidity for ${tokenName} pair on ${dexName}`);
        }
      }
      return null;
    } catch (err) {
      console.error(`Error fetching ${dexName} price on ${chainId}:`, err);
      return null;
    }
  }, []);

  const fetchAllPrices = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const allPrices = {
      apiPrices: {},
      dexPrices: {}
    };

    try {
      // Fetch API prices first (CoinGecko and Coinbase)
      const [geckoPrice, coinbasePrice] = await Promise.all([
        fetchCoinGeckoPrice(),
        fetchCoinbasePrice()
      ]);

      if (geckoPrice) allPrices.apiPrices.coingecko = geckoPrice;
      if (coinbasePrice) allPrices.apiPrices.coinbase = coinbasePrice;

      // Then fetch DEX prices
      const chainIds = Object.keys(dexConfig).filter(key => 
        key !== 'chainIds' && key !== 'rpcUrls'
      );

      for (const chainId of chainIds) {
        const rpcUrl = dexConfig.rpcUrls[chainId];
        if (!rpcUrl) continue;

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const dexNames = Object.keys(dexConfig[chainId].dexes);
        
        const chainPrices = {};
        for (const dexName of dexNames) {
          const price = await fetchDexPrice(chainId, dexName, provider, dexConfig[chainId]);
          if (price) chainPrices[dexName] = price;
        }

        if (Object.keys(chainPrices).length > 0) {
          allPrices.dexPrices[chainId] = {
            ...dexConfig[chainId],
            prices: chainPrices
          };
        }
      }

      setPrices(allPrices);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Price fetch error:', err);
      setError('Failed to fetch some prices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fetchCoinGeckoPrice, fetchCoinbasePrice, fetchDexPrice]);

  useEffect(() => {
    fetchAllPrices();
    const interval = setInterval(fetchAllPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchAllPrices]);

  const renderPriceRow = (priceData, key) => (
    <tr key={key}>
      <td>{priceData.source}</td>
      <td>{priceData.blockchain}</td>
      <td>{priceData.pair}</td>
      <td>${priceData.price}</td>
      <td>{new Date(priceData.timestamp).toLocaleTimeString()}</td>
    </tr>
  );

  if (loading) {
    return (
      <div className="dex-price-tracker-loading">
        <div className="spinner"></div>
        <p>Loading prices...</p>
      </div>
    );
  }

  return (
    <div className="dex-price-tracker">
      <div className="dex-price-tracker-header">
        <h1>Multi-Source Crypto Price Tracker</h1>
        {lastUpdated && (
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        )}
      </div>
      
      <button onClick={fetchAllPrices} disabled={loading} className="refresh-button">
        {loading ? 'Refreshing...' : 'Refresh Prices'}
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="price-sections">
        {/* API Prices Section */}
        <div className="price-section">
          <h2>Centralized Price References</h2>
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Blockchain</th>
                <th>Pair</th>
                <th>Price (USD)</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(prices.apiPrices).map(renderPriceRow)}
            </tbody>
          </table>
        </div>

        {/* DEX Prices Section */}
        {Object.keys(prices.dexPrices).length > 0 && (
          <div className="price-section">
            <h2>Decentralized Exchange Prices</h2>
            {Object.entries(prices.dexPrices).map(([chainId, chainData]) => (
              <div key={chainId} className="network-section">
                <h3>{chainId.charAt(0).toUpperCase() + chainId.slice(1)} Network</h3>
                <table>
                  <thead>
                    <tr>
                      <th>DEX</th>
                      <th>Blockchain</th>
                      <th>Pair</th>
                      <th>Price (USD)</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(chainData.prices).map((priceData, i) => 
                      renderPriceRow(priceData, `${chainId}-${i}`)
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DEXPriceTracker;


// import React, { useState, useEffect } from 'react';
// import { getSwap, ChainId } from 'sushi';
// import { createPublicClient, http, isAddress } from 'viem';

// const SushiSwapPriceComponent = () => {
//   const [swapDetails, setSwapDetails] = useState(null);
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchSwapPrice = async () => {
//       try {
//         // Predefined token addresses (verified)
//         const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
//         const SUSHI = '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2';

//         // Validate addresses first
//         if (!isAddress(WETH) || !isAddress(SUSHI)) {
//           throw new Error('Invalid token addresses');
//         }

//         // Create public client
//         const client = createPublicClient({
//           chain: 'ethereum',
//           transport: http('https://eth-mainnet.g.alchemy.com/v2/iIks_aShfkGOF8-Nl658iTVe9kxC62jM')
//         });

//         // Additional sender address (optional)
//         const SENDER = '0x9aA1750a79951570805890b2B7c08De5F71f8fEc';

//         // Swap parameters with explicit sender
//         const swapParams = {
//           chainId: ChainId.ETHEREUM,
//           tokenIn: WETH,
//           tokenOut: SUSHI,
//           amount: 1000000000000000000n, // 1 WETH
//           maxSlippage: 0.005,
//           sender: SENDER,
//           recipient: SENDER
//         };

//         // Attempt swap
//         const swap = await getSwap(swapParams);

//         setSwapDetails({
//           amountIn: swap.amountIn.toString(),
//           amountOut: swap.amountOut.toString(),
//           priceImpact: swap.priceImpact
//         });
//         setLoading(false);
//       } catch (error) {
//         console.error('Swap Error Details:', {
//           message: error.message,
//           fullError: error
//         });

//         setError(error.message);
//         setLoading(false);
//       }
//     };

//     fetchSwapPrice();
//   }, []);

//   // Styling object
//   const styles = {
//     container: {
//       fontFamily: 'Arial, sans-serif',
//       maxWidth: '400px',
//       margin: '20px auto',
//       padding: '20px',
//       backgroundColor: '#f5f5f5',
//       borderRadius: '8px',
//       boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
//     },
//     loading: {
//       textAlign: 'center',
//       color: '#666'
//     },
//     error: {
//       color: 'red',
//       textAlign: 'center'
//     },
//     detailsContainer: {
//       backgroundColor: '#e0e0e0',
//       padding: '15px',
//       borderRadius: '6px',
//       marginTop: '15px'
//     },
//     detailRow: {
//       display: 'flex',
//       justifyContent: 'space-between',
//       marginBottom: '10px'
//     }
//   };

//   if (loading) {
//     return (
//       <div style={styles.container}>
//         <div style={styles.loading}>Loading swap details...</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div style={styles.container}>
//         <div style={styles.error}>Error: {error}</div>
//       </div>
//     );
//   }

//   return (
//     <div style={styles.container}>
//       <h2>Sushi Swap Price Details</h2>
//       <div style={styles.detailsContainer}>
//         <div style={styles.detailRow}>
//           <span>Amount In:</span>
//           <span>{swapDetails.amountIn} Wei</span>
//         </div>
//         <div style={styles.detailRow}>
//           <span>Amount Out:</span>
//           <span>{swapDetails.amountOut} SUSHI</span>
//         </div>
//         <div style={styles.detailRow}>
//           <span>Price Impact:</span>
//           <span>{(swapDetails.priceImpact * 100).toFixed(2)}%</span>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SushiSwapPriceComponent;



// import React, { useState, useEffect } from 'react';
// import axios from 'axios';

// const BnbPriceFetcher = () => {
//   const [prices, setPrices] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   // Define the blockchain networks and their corresponding BNB tickers
//   const networks = [
//     { name: 'Binance Smart Chain', ticker: 'BNB.BSC' },
//     { name: 'Ethereum', ticker: 'BNB.ETH' },
//     { name: 'THORChain', ticker: 'BNB.THOR' },
//     { name: 'Binance Beacon Chain', ticker: 'BNB.BEACON' }
//   ];

//   const fetchBnbPrice = async (ticker) => {
//     try {
//       const response = await axios.get(
//         'https://api.thorswap.net/aggregator/tokens/quote',
//         {
//           params: {
//             sellAsset: ticker,
//             buyAsset: 'USD.USD',
//             sellAmount: '100000000', // 1 BNB (in smallest unit)
//           },
//           headers: {
//             'Referer': 'bnb-price-fetcher',
//             'x-api-key': 'your-api-key-here' // Replace with your actual API key
//           }
//         }
//       );

//       if (response.data && response.data.routes && response.data.routes[0]) {
//         const bestRoute = response.data.routes[0];
//         // Calculate price per 1 BNB
//         const pricePerBnb = bestRoute.expectedOutput / (bestRoute.sellAmount / 1e8);
//         return pricePerBnb.toFixed(2);
//       }
//       return 'N/A';
//     } catch (err) {
//       console.error(`Error fetching price for ${ticker}:`, err);
//       return 'Error';
//     }
//   };

//   const fetchAllPrices = async () => {
//     setLoading(true);
//     setError(null);
    
//     try {
//       const pricePromises = networks.map(async (network) => {
//         const price = await fetchBnbPrice(network.ticker);
//         return { ...network, price };
//       });

//       const results = await Promise.all(pricePromises);
//       const priceMap = results.reduce((acc, curr) => {
//         acc[curr.name] = curr.price;
//         return acc;
//       }, {});

//       setPrices(priceMap);
//     } catch (err) {
//       setError('Failed to fetch prices. Please try again later.');
//       console.error('Error fetching prices:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchAllPrices();
//     // Refresh prices every 60 seconds
//     const interval = setInterval(fetchAllPrices, 60000);
//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <div className="bnb-price-fetcher">
//       <h2>BNB/USD Prices Across Blockchains</h2>
//       {loading && <p>Loading prices...</p>}
//       {error && <p className="error">{error}</p>}
      
//       <div className="price-grid">
//         {Object.entries(prices).map(([network, price]) => (
//           <div key={network} className="price-card">
//             <h3>{network}</h3>
//             <p className="price">${price}</p>
//             <p className="ticker">BNB/USD</p>
//           </div>
//         ))}
//       </div>
      
//       <button onClick={fetchAllPrices} disabled={loading}>
//         {loading ? 'Refreshing...' : 'Refresh Prices'}
//       </button>
      
//       <style jsx>{`
//         .bnb-price-fetcher {
//           max-width: 800px;
//           margin: 0 auto;
//           padding: 20px;
//           font-family: Arial, sans-serif;
//         }
        
//         h2 {
//           text-align: center;
//           color: #333;
//         }
        
//         .price-grid {
//           display: grid;
//           grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
//           gap: 20px;
//           margin: 30px 0;
//         }
        
//         .price-card {
//           background: #f8f9fa;
//           border-radius: 8px;
//           padding: 20px;
//           text-align: center;
//           box-shadow: 0 2px 4px rgba(0,0,0,0.1);
//         }
        
//         .price-card h3 {
//           margin-top: 0;
//           color: #555;
//         }
        
//         .price {
//           font-size: 24px;
//           font-weight: bold;
//           color: #007bff;
//           margin: 10px 0;
//         }
        
//         .ticker {
//           color: #666;
//           font-size: 14px;
//         }
        
//         button {
//           display: block;
//           margin: 20px auto;
//           padding: 10px 20px;
//           background: #007bff;
//           color: white;
//           border: none;
//           border-radius: 4px;
//           cursor: pointer;
//           font-size: 16px;
//         }
        
//         button:hover {
//           background: #0056b3;
//         }
        
//         button:disabled {
//           background: #cccccc;
//           cursor: not-allowed;
//         }
        
//         .error {
//           color: #dc3545;
//           text-align: center;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default BnbPriceFetcher;

// import React, { useState, useEffect } from 'react';
// import { ethers } from 'ethers';

// // PancakeSwap V3 Router address on Arbitrum
// const PANCAKESWAP_V3_ROUTER = '0x32226588378236Fd0c7c4053999F88aC0e5cAc77';

// // ABI for the V3 Router (simplified for price fetching)
// const V3_ROUTER_ABI = [
//   'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
// ];

// // Token addresses on Arbitrum
// const WBNB_ADDRESS = '0x04B0B3AdAEe4c9E354C5B5f673A5De830A21AfA3'; // WBNB on Arbitrum
// const USDC_ADDRESS = '0xaf88d065e77c8cC2d45FE239E5ScdaeFd3655325'; // USDC on Arbitrum

// const BNBUSDPriceFetcher = () => {
//   const [bnbPrice, setBnbPrice] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchBNBPrice = async () => {
//       try {
//         // Connect to Arbitrum network 
//         const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
        
//         // Create router contract instance
//         const routerContract = new ethers.Contract(
//           PANCAKESWAP_V3_ROUTER, 
//           V3_ROUTER_ABI, 
//           provider
//         );

//         // Amount of WBNB to convert (1 WBNB)
//         const amountIn = ethers.utils.parseUnits('1', 18);

//         // Estimate price using exactInputSingle
//         const amountOut = await routerContract.callStatic.exactInputSingle([
//           WBNB_ADDRESS,        // tokenIn
//           USDC_ADDRESS,        // tokenOut
//           3000,                // fee tier (0.3%)
//           provider.getSigner().getAddress(), // recipient
//           Math.floor(Date.now() / 1000) + 60 * 20, // deadline 20 minutes from now
//           amountIn,            // amountIn (1 WBNB)
//           0,                   // amountOutMinimum
//           0                    // sqrtPriceLimitX96
//         ]);

//         // Convert to USD price
//         const price = ethers.utils.formatUnits(amountOut, 6);
//         setBnbPrice(price);
//         setLoading(false);
//       } catch (err) {
//         console.error('Error fetching BNB price:', err);
//         setError(err.message);
//         setLoading(false);
//       }
//     };

//     fetchBNBPrice();
//   }, []);

//   if (loading) return <div>Loading BNB price...</div>;
//   if (error) return <div>Error: {error}</div>;

//   return (
//     <div className="bg-gray-100 p-4 rounded-lg shadow-md">
//       <h2 className="text-xl font-bold mb-2">BNB/USD Price</h2>
//       <p className="text-2xl text-blue-600">
//         ${bnbPrice ? parseFloat(bnbPrice).toFixed(2) : 'N/A'}
//       </p>
//       <small className="text-gray-500">
//         Fetched from PancakeSwap V3 Router on Arbitrum
//       </small>
//     </div>
//   );
// };

// export default BNBUSDPriceFetcher;