const {utils} = require("ethers");

function getDomainSeparator(tokenAddress) {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        utils.keccak256(utils.toUtf8Bytes("EIP712Domain(string name,string version,address verifyingContract)")),
        utils.keccak256(utils.toUtf8Bytes("The Sandbox 3D")),
        utils.keccak256(utils.toUtf8Bytes("1")),
        1,
        tokenAddress,
      ]
    )
  );
}

module.exports.getApprovalDigest = async function (tokenAddress, approve, nonce, deadline) {
  const DOMAIN_SEPARATOR = getDomainSeparator(tokenAddress);
  // eslint-disable-next-line prettier/prettier
  const PERMIT_TYPEHASH = utils.keccak256(
    utils.toUtf8Bytes("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
  );
  return utils.keccak256(
    utils.solidityPack(
      ["bytes1", "bytes1", "bytes32", "bytes32"],
      [
        "0x19",
        "0x01",
        DOMAIN_SEPARATOR,
        utils.keccak256(
          utils.defaultAbiCoder.encode(
            ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
            [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
          )
        ),
      ]
    )
  );
};
