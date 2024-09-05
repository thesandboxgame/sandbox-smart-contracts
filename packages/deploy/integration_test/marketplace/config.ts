export const GRID_SIZE = 408;

// Configuration for ERC721 land tokens (array of [x,y] values)
export const erc721 = [
  // Add (x, y) pairs as needed
];

// Configuration for quad land (array of [x, y, size] values)
export const quad = [
  // Add (size,x, y) triples as needed
];

// Configuration for ERC1155 assets (array of [tokenId, supply] values)
export const erc1155 = [
  // Add [tokenId, supply] pairs as needed
];

// ERC20 price paid by buyer
export const erc20Price = 0;

// Price distribution setup
// TODO: to be updated after audit fixes
export const priceDistribution = {
  erc20Prices: [],
  erc721Prices: [[]],
  erc1155Prices: [[]],
  quadPrices: [],
};
