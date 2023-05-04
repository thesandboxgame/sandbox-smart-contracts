export type ERC1155data = {
  ids: string[];
  values: number[];
  contractAddress: string;
};

export type AssetClaimData = {
  to: string;
  erc1155: ERC1155data[];
  erc721: never[];
  erc20: {amounts: never[]; contractAddresses: never[]};
};
