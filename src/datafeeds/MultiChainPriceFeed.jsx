import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './MultiChainPriceFeed.css';

// AggregatorV3Interface ABI - minimal ABI for price feed
const aggregatorV3InterfaceABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  }
];

// Chain configurations
const chains = [
  {
    id: "arbitrum",
    name: "Arbitrum",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    priceFeedAddress: "0x6970460aabF80C5BE983C6b74e5D06dEDCA95D4A",
    pair: "BNB/USD",
    icon: "🔵",
  },
  {
    id: "avalanche",
    name: "Avalanche",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    priceFeedAddress: "0xBb92195Ec95DE626346eeC8282D53e261dF95241",
    pair: "BNB/USD",
    icon: "❄️",
  },
  {
    id: "base",
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    priceFeedAddress: "0x4b7836916781CAAfbb7Bd1E5FDd20ED544B453b1",
    pair: "BNB/USD",
    icon: "🔷",
  },
  {
    id: "bnb",
    name: "BNB Chain",
    rpcUrl: "https://bsc-dataseed.binance.org",
    priceFeedAddress: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
    pair: "BNB/USD",
    icon: "🟡",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/iIks_aShfkGOF8-Nl658iTVe9kxC62jM",
    priceFeedAddress: "0x14e613AC84a31f709eadbdF89C6CC390fDc9540A",
    pair: "BNB/USD",
    icon: "⟠",
  },
  {
    id: "fantom",
    name: "Fantom Opera",
    rpcUrl: "https://fantom-mainnet.g.alchemy.com/v2/gc8LPqeXM7ZGja289ivR7YoerEUSEDLF",
    priceFeedAddress: "0x6dE70f4791C4151E00aD02e969bD900DC961f92a",
    pair: "BNB/USD",
    icon: "👻",
  },
  {
    id: "gnosis",
    name: "Gnosis Chain",
    rpcUrl: "https://gnosis-mainnet.g.alchemy.com/v2/gc8LPqeXM7ZGja289ivR7YoerEUSEDLF",
    priceFeedAddress: "0x6D42cc26756C34F26BEcDD9b30a279cE9Ea8296E",
    pair: "BNB/USD",
    icon: "🦊",
  },
  {
    id: "moonbeam",
    name: "Moonbeam",
    rpcUrl: "https://rpc.api.moonbeam.network",
    priceFeedAddress: "0x0147f2Ad7F1e2Bc51F998CC128a8355d5AE8C32D",
    pair: "BNB/USD",
    icon: "🌕",
  },
  {
    id: "moonriver",
    name: "Moonriver",
    rpcUrl: "https://rpc.api.moonriver.moonbeam.network",
    priceFeedAddress: "0xD6B013A65C22C372F995864CcdAE202D0194f9bf",
    pair: "BNB/USD",
    icon: "🌙",
  },
  {
    id: "optimism",
    name: "OP Mainnet",
    rpcUrl: "https://mainnet.optimism.io",
    priceFeedAddress: "0xD38579f7cBD14c22cF1997575eA8eF7bfe62ca2c",
    pair: "BNB/USD",
    icon: "🔴",
  },
  {
    id: "polygon",
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    priceFeedAddress: "0x82a6c4AF830caa6c97bb504425f6A66165C2c26e",
    pair: "BNB/USD",
    icon: "🟣",
  },
  {
    id: "scroll",
    name: "Scroll",
    rpcUrl: "https://rpc.scroll.io",
    priceFeedAddress: "0x1AC823FdC79c30b1aB1787FF5e5766D6f29235E1",
    pair: "BNB/USD",
    icon: "📜",
  },
];

// Trade amount options
const tradeAmountOptions = Array.from({ length: 20 }, (_, i) => (i + 1) * 1000);

const MultiChainPriceFeed = () => {
  const [priceData, setPriceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [arbitrageOpportunities, setArbitrageOpportunities] = useState([]);
  const [minProfitThreshold, setMinProfitThreshold] = useState(0.1); // Minimum profit in USD to show opportunity
  const [tradeAmount, setTradeAmount] = useState(1000); // Default trade amount in USD
  const [selectedTradeAmountIndex, setSelectedTradeAmountIndex] = useState(0); // Default index (1000)

  const calculateArbitrageOpportunities = (prices) => {
    const opportunities = [];
    const validChains = chains.filter((chain) => prices[chain.id] && prices[chain.id].status === "success" && prices[chain.id].price);

    for (let i = 0; i < validChains.length; i++) {
      for (let j = 0; j < validChains.length; j++) {
        if (i !== j) {
          const buyChain = validChains[i];
          const sellChain = validChains[j];

          const buyPrice = parseFloat(prices[buyChain.id].price);
          const sellPrice = parseFloat(prices[sellChain.id].price);

          // Calculate potential profit (ignoring gas fees and other costs)
          // Calculate BNB amount based on USD value
          const bnbAmount = tradeAmount / buyPrice;
          
          // Calculate profit in USD
          const profit = bnbAmount * (sellPrice - buyPrice);

          if (profit > minProfitThreshold) {
            opportunities.push({
              buyChain,
              sellChain,
              buyPrice,
              sellPrice,
              profit,
              bnbAmount,
              profitPercentage: (profit / tradeAmount) * 100,
            });
          }
        }
      }
    }

    // Sort by profit (highest first)
    return opportunities.sort((a, b) => b.profit - a.profit);
  };

  const fetchPrices = async () => {
    setRefreshing(true);
    const newPriceData = { ...priceData };

    await Promise.all(
      chains.map(async (chain) => {
        try {
          // Updated for ethers v6.x
          const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
          const priceFeed = new ethers.Contract(chain.priceFeedAddress, aggregatorV3InterfaceABI, provider);

          const decimals = await priceFeed.decimals();
          const roundData = await priceFeed.latestRoundData();

          // Updated to use formatUnits from ethers
          const formattedPrice = ethers.formatUnits(roundData[1], decimals);
          const timestamp = new Date(Number(roundData[3]) * 1000);

          newPriceData[chain.id] = {
            price: parseFloat(formattedPrice).toFixed(2),
            lastUpdate: timestamp.toLocaleTimeString(),
            status: "success",
            timestamp: timestamp,
          };
        } catch (err) {
          console.error(`Error fetching price for ${chain.name}:`, err);
          newPriceData[chain.id] = {
            price: null,
            lastUpdate: null,
            status: "error",
            error: `Failed to fetch price from ${chain.name}`,
          };
        }
      })
    );

    setPriceData(newPriceData);
    setLastUpdated(new Date().toLocaleTimeString());

    // Calculate arbitrage opportunities
    const opportunities = calculateArbitrageOpportunities(newPriceData);
    setArbitrageOpportunities(opportunities);

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, [tradeAmount, minProfitThreshold]);

  // Function to handle trade amount change
  const handleTradeAmountChange = (e) => {
    const selectedIndex = parseInt(e.target.value);
    setSelectedTradeAmountIndex(selectedIndex);
    setTradeAmount(tradeAmountOptions[selectedIndex]);
  };

  return (
    <div className="multi-chain-price-feed">
      <div className="price-feed-header">
        <h1>Cross Chain BNB/USDT Price Feeds</h1>
        <div className="refresh-info">
          <span>Last refresh: {lastUpdated || "Initializing..."}</span>
          <button className={`refresh-button ${refreshing ? "refreshing" : ""}`} onClick={fetchPrices} disabled={refreshing} aria-label="Refresh prices">
            ↻
          </button>
        </div>
      </div>

      <div className="settings-panel">
        <div className="setting-control">
          <label htmlFor="trade-amount">Trade Amount (USD):</label>
          <select 
            id="trade-amount" 
            value={selectedTradeAmountIndex}
            onChange={handleTradeAmountChange}
            className="trade-amount-dropdown"
          >
            {tradeAmountOptions.map((amount, index) => (
              <option key={index} value={index}>${amount.toLocaleString()}</option>
            ))}
          </select>
        </div>
        <button 
          className="refresh-settings-button" 
          onClick={fetchPrices}
        >
          Refresh Data
        </button>
      </div>

      <div className="price-table-container">
        <table className="price-table">
          <thead>
            <tr>
              <th>Chain</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && !Object.keys(priceData).length ? (
              <tr>
                <td colSpan="4" className="loading-row">
                  Loading price data from all chains...
                </td>
              </tr>
            ) : (
              chains.map((chain) => {
                const data = priceData[chain.id] || {};
                return (
                  <tr key={chain.id} className={data.status}>
                    <td className="network-cell">
                      {/* <span className="chain-icon">{chain.icon}</span> */}
                      {chain.name}
                    </td>
                    <td className="price-cell">{data.price ? `$${data.price}` : "—"}</td>
                    <td className="status-cell">{data.status === "success" ? <span className="status-badge success">Online</span> : <span className="status-badge error">Error</span>}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="arbitrage-opportunities">
        <h2>Arbitrage Opportunities</h2>
        {arbitrageOpportunities.length > 0 ? (
          <div className="opportunities-list">
            {arbitrageOpportunities.map((opportunity, index) => (
              <div key={index} className="opportunity-card">
                <h3>Opportunity #{index + 1}</h3>
                <p>
                  Buy {opportunity.bnbAmount.toFixed(4)} BNB on <span className="chain-buy">{opportunity.buyChain.name}</span> at <span className="price-value">${opportunity.buyPrice}</span> per BNB and sell on <span className="chain-sell">{opportunity.sellChain.name}</span> at <span className="price-value">${opportunity.sellPrice}</span> per BNB, earning a profit of <span className="profit-value">${opportunity.profit.toFixed(2)}</span> (<span className="profit-percentage">{opportunity.profitPercentage.toFixed(2)}%</span>).
                </p>
                <div className="opportunity-details">
                  <div className="detail">
                    <span className="label">Trade Amount:</span>
                    <span className="value trade-amount-value">${tradeAmount.toLocaleString()}</span>
                  </div>
                  <div className="detail">
                    <span className="label">BNB Amount:</span>
                    <span className="value">{opportunity.bnbAmount.toFixed(4)} BNB</span>
                  </div>
                  <div className="detail">
                    <span className="label">Buy Total:</span>
                    <span className="value">${tradeAmount.toLocaleString()}</span>
                  </div>
                  <div className="detail">
                    <span className="label">Sell Total:</span>
                    <span className="value">${(opportunity.bnbAmount * opportunity.sellPrice).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-opportunities">No profitable arbitrage opportunities found at current prices with the specified threshold.</p>
        )}
      </div>
    </div>
  );
};

export default MultiChainPriceFeed;