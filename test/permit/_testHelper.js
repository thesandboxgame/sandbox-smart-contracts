const {utils} = require("ethers");

function getDomainSeparator(address) {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "address"],
      [
        utils.keccak256(utils.toUtf8Bytes("EIP712Domain(string name,string version,address verifyingContract)")),
        utils.keccak256(utils.toUtf8Bytes("The Sandbox 3D")),
        utils.keccak256(utils.toUtf8Bytes("1")),
        address,
      ]
    )
  );
}

module.exports.getApprovalDigest = function (address, approve, nonce, deadline) {
  const DOMAIN_SEPARATOR = getDomainSeparator(address);
  // eslint-disable-next-line prettier/prettier
  const PERMIT_TYPEHASH = utils.keccak256(
    utils.toUtf8Bytes("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
  );
  return utils.keccak256(
    utils.solidityPack(
      ["bytes2", "bytes32", "bytes32"],
      [
        "0x1901",
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
