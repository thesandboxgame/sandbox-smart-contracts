pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./ERC1155BaseToken.sol";


contract MintableERC1155Token is ERC1155BaseToken {
    event Minter(address minter, bool enabled);

    /// @notice Enable or disable the ability of `minter` to mint tokens
    /// @param minter address that will be given/removed minter right.
    /// @param enabled set whether the minter is enabled or disabled.
    function setMinter(address minter, bool enabled) external {
        require(msg.sender == _admin, "only admin is allowed to add minters");
        _setMinter(minter, enabled);
    }

    /// @notice check whether address `who` is given minter rights.
    /// @param who The address to query.
    /// @return whether the address has minter rights.
    function isMinter(address who) public view returns (bool) {
        return _minters[who];
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) external {
        require(_minters[msg.sender], "only minter allowed to mint");
        (uint256 bin, uint256 index) = id.getTokenBinIndex();
        _packedTokenBalance[to][bin] = ObjectLib32.updateTokenBalance(_packedTokenBalance[to][bin], index, amount, ObjectLib32.Operations.ADD);
        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }

    function batchMint(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external {
        require(_minters[msg.sender], "only minter allowed to mint");
        require(to != address(0), "to is zero address");

        uint256 balTo;

        uint256 lastBin = ~uint256(0);
        for (uint256 i = 0; i < ids.length; i++) {
            if (amounts[i] > 0) {
                (uint256 bin, uint256 index) = ids[i].getTokenBinIndex();
                if (lastBin == ~uint256(0)) {
                    lastBin = bin;
                    balTo = ObjectLib32.updateTokenBalance(_packedTokenBalance[to][bin], index, amounts[i], ObjectLib32.Operations.ADD);
                } else {
                    if (bin != lastBin) {
                        _packedTokenBalance[to][lastBin] = balTo;
                        balTo = _packedTokenBalance[to][bin];
                        lastBin = bin;
                    }

                    balTo = balTo.updateTokenBalance(index, amounts[i], ObjectLib32.Operations.ADD);
                }
            }
        }
        if (lastBin != ~uint256(0)) {
            _packedTokenBalance[to][lastBin] = balTo;
        }
        emit TransferBatch(msg.sender, address(0), to, ids, amounts);
    }

    // /////////////////////// INTERNAL
    function _setMinter(address minter, bool enabled) internal {
        _minters[minter] = enabled;
        emit Minter(minter, enabled);
    }

    // ////////////////////////
    mapping(address => bool) internal _minters;

    // ////////////////////////
    constructor(
        address metaTransactionContract,
        address admin,
        address initialMinter
    ) internal ERC1155BaseToken(metaTransactionContract, admin) {
        _setMinter(initialMinter, true);
    }
}
