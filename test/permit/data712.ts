import { BigNumber } from "ethers";

type Message = {
  owner: string,
  spender: string,
  value: BigNumber,
  nonce: BigNumber,
  deadline: BigNumber,
};

type Contract = {
  address: string,
};

type Type = {
  name: string,
  type: string
};

type Data712 = {
  types: {
    EIP712Domain: Array<Type>,
    Permit: Array<Type>,
  },
  primaryType: string,
    domain: {
      name: string,
      version: string,
      verifyingContract: string,
    },
    message: Message,
};

export const data712 = function (verifyingContract: Contract, message: Message): Data712 {
  return {
    types: {
      EIP712Domain: [
        {
          name: "name",
          type: "string",
        },
        {
          name: "version",
          type: "string",
        },
        {
          name: "verifyingContract",
          type: "address",
        },
      ],
      Permit: [
        {
          name: "owner",
          type: "address",
        },
        {
          name: "spender",
          type: "address",
        },
        {
          name: "value",
          type: "uint256",
        },
        {
          name: "nonce",
          type: "uint256",
        },
        {
          name: "deadline",
          type: "uint256",
        },
      ],
    },
    primaryType: "Permit",
    domain: {
      name: "The Sandbox",
      version: "1",
      verifyingContract: verifyingContract.address,
    },
    message: message,
  };
};
