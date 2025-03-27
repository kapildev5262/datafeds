const dexAbis = {
  pancakeswap: [
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    "function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)",
  ],
  apeswap: [
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    "function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)",
  ],
  uniswap: [
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
    "function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)",
  ],
  sushiswap: [
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    "function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)",
  ],
  traderjoe: [
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
    "function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)",
  ],
  pangolin: [
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
    "function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)",
  ],
  camelot: [
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    "function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)",
  ],
};

export default dexAbis;
