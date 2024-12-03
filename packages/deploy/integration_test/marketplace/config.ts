export const GRID_SIZE = 408;

//ERC20 to exchange for
export const erc20PriceForBundle = 10000000000;

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
  // Add [tier, amount, metadataHash] as needed
];

// Price distribution setup
export const priceDistribution = {
  erc721Prices: [[]],
  erc1155Prices: [[]],
  quadPrices: [],
};
