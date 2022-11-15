import axios from 'axios';
import {network} from 'hardhat';

const baseUrl =
  network.name === 'polygon'
    ? 'https://api.sandbox.game'
    : 'https://api-demo.sandbox.game';

const getClaim = async (
  claimId: number | string
): Promise<{id: number; name: string; rootHash: string}> => {
  const {data} = await axios.get(`${baseUrl}/assetclaims/${claimId}`);
  return data;
};

export default {
  getClaim,
};
