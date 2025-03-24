import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import "./MultiChainPriceFeed.css";

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
      { name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
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
    name: "OP",
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
];

// Trade amount options
const tradeAmountOptions = Array.from({ length: 50 }, (_, i) => (i + 1) * 1000);

// Fee calculator function
const calculateArbitrageFees = (fundAmount) => {
  // Validate input
  if (fundAmount < 1000 || fundAmount > 50000) {
    return { error: "Fund amount must be between 1000 and 50000 USDT" };
  }

  // Calculate individual fees
  const serviceFee = fundAmount * 0.002; // 0.2% service fee
  const botFee = 1.0; // Fixed 1 USDT bot fee per transaction
  const gasFeeUSDT = 2.0; // Fixed 2 USDT gas fee per transaction

  // Calculate total fees in USDT
  const totalFeesUSDT = serviceFee + botFee + gasFeeUSDT;

  return {
    fundAmount: fundAmount,
    serviceFee: serviceFee,
    botFee: botFee,
    gasFeeUSDT: gasFeeUSDT,
    totalFeesUSDT: totalFeesUSDT,
    totalFeesPercentage: (totalFeesUSDT / fundAmount) * 100,
  };
};

const MultiChainPriceFeed = () => {
  const [priceData, setPriceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [arbitrageOpportunities, setArbitrageOpportunities] = useState([]);
  const [minProfitThreshold, setMinProfitThreshold] = useState(0.1);
  const [tradeAmount, setTradeAmount] = useState(50000);
  const [selectedTradeAmountIndex, setSelectedTradeAmountIndex] = useState(49);
  const [newOpportunities, setNewOpportunities] = useState([]);

  // Use ref to keep track of previous opportunities for comparison
  const previousOpportunitiesRef = useRef([]);

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

          // Calculate BNB amount based on USD value
          const bnbAmount = tradeAmount / buyPrice;

          // Calculate gross profit in USD (before fees)
          const grossProfit = bnbAmount * (sellPrice - buyPrice);

          // Calculate fees for the entire arbitrage (based on trade amount)
          const fees = calculateArbitrageFees(tradeAmount);

          // Calculate net profit after deducting fees
          const netProfit = grossProfit - fees.totalFeesUSDT;

          // Only include opportunities that are profitable after fees
          if (netProfit > 0) {
            opportunities.push({
              buyChain,
              sellChain,
              buyPrice,
              sellPrice,
              grossProfit,
              fees: fees,
              netProfit,
              bnbAmount,
              netProfitPercentage: (netProfit / tradeAmount) * 100,
              id: `${buyChain.id}-${sellChain.id}`, // Add a unique identifier
            });
          }
        }
      }
    }

    // Sort by net profit (highest first)
    return opportunities.sort((a, b) => b.netProfit - a.netProfit);
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
            price: parseFloat(formattedPrice).toFixed(6),
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

    // Check for new opportunities by comparing with previous
    const prevOpIds = (previousOpportunitiesRef.current || []).map((op) => op.id);
    const newOps = opportunities.filter((op) => !prevOpIds.includes(op.id));

    // Set new opportunities to highlight
    if (newOps.length > 0) {
      setNewOpportunities(newOps.map((op) => op.id));

      // Clear highlighting after 2 seconds
      setTimeout(() => {
        setNewOpportunities([]);
      }, 2000);
    }

    // Update opportunities state and reference
    setArbitrageOpportunities(opportunities);
    previousOpportunitiesRef.current = opportunities;

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
        <h1>Cross Chain BNB/USDT</h1>
        <div className="refresh-info">
          <span>Last refresh: {lastUpdated || "Initializing..."}</span>
          <button className={`refresh-button ${refreshing ? "refreshing" : ""}`} onClick={fetchPrices} disabled={refreshing} aria-label="Refresh prices">
            ↻
          </button>
        </div>
      </div>

      <div className="settings-panel">
        <div className="setting-control">
          <label htmlFor="trade-amount">Trade Amount (USDT):</label>
          <select id="trade-amount" value={selectedTradeAmountIndex} onChange={handleTradeAmountChange} className="trade-amount-dropdown">
            {tradeAmountOptions.map((amount, index) => (
              <option key={index} value={index}>
                ${amount.toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        <button className="refresh-settings-button" onClick={fetchPrices}>
          Refresh
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
        <h2>Arbitrage Opportunities (After Fees)</h2>
        {arbitrageOpportunities.length > 0 ? (
          <div className="opportunities-list">
            {arbitrageOpportunities.map((opportunity, index) => (
              <div key={index} className={`opportunity-card ${newOpportunities.includes(opportunity.id) ? "new-opportunity" : ""}`}>
                <h3>Opportunity #{index + 1}</h3>
                <p>
                  Buy {opportunity.bnbAmount.toFixed(6)} BNB on <span className="chain-buy">{opportunity.buyChain.name}</span> at{" "}
                  <span className="price-value">${opportunity.buyPrice.toFixed(6)}</span> per BNB and sell on <span className="chain-sell">{opportunity.sellChain.name}</span> at{" "}
                  <span className="price-value">${opportunity.sellPrice.toFixed(6)}</span> per BNB.
                </p>
                <div className="opportunity-details">
                  <div className="detail">
                    <span className="label">Trade Amount:</span>
                    <span className="value trade-amount-value">${opportunity.fees.fundAmount.toFixed(6)}</span>
                  </div>
                  <div className="detail">
                    <span className="label">BNB Amount:</span>
                    <span className="value">{opportunity.bnbAmount.toFixed(6)} BNB</span>
                  </div>
                  <div className="detail">
                    <span className="label">Buy Total:</span>
                    <span className="value">${tradeAmount.toFixed(6)}</span>
                  </div>
                  <div className="detail">
                    <span className="label">Sell Total:</span>
                    <span className="value">${(opportunity.bnbAmount * opportunity.sellPrice).toFixed(6)}</span>
                  </div>
                  <div className="detail">
                    <span className="label">Gross Profit:</span>
                    <span className="value">${opportunity.grossProfit.toFixed(6)}</span>
                  </div>
                  <div className="detail fees-detail">
                    <span className="label">Transaction Fees:</span>
                    <span className="value fees-value">${opportunity.fees.totalFeesUSDT.toFixed(6)}</span>
                    {/* <div className="fees-breakdown">
                      <div>Service Fee (0.2%): ${opportunity.fees.serviceFee.toFixed(6)}</div>
                      <div>Bot Fee: ${opportunity.fees.botFee.toFixed(6)}</div>
                      <div>Gas Fee: ${opportunity.fees.gasFeeUSDT.toFixed(6)}</div>
                    </div> */}
                  </div>
                  <div className="detail net-profit-detail">
                    <span className="label">Net Profit:</span>
                    <span className="profit-percentage">({opportunity.netProfitPercentage.toFixed(4)}%)</span>
                    <span className="value net-profit-value">${opportunity.netProfit.toFixed(6)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-opportunities">No profitable arbitrage opportunities found after deducting fees.</p>
        )}
      </div>
    </div>
  );
};

export default MultiChainPriceFeed;
