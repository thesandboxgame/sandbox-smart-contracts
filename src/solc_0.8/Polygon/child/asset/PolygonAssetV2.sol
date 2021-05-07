//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "../../../asset/ERC1155ERC721.sol";
import "@openzeppelin/contracts-0.8/utils/Address.sol";

// solhint-disable-next-line no-empty-blocks
contract PolygonAssetV2 is ERC1155ERC721 {
    using Address for address;

    address private _childChainManager;

    event ChainExit(address indexed to, uint256[] tokenIds, uint256[] amounts, bytes data);

    /// @notice fulfills the purpose of a constructor in upgradeabale contracts
    function initialize(
        address trustedForwarder,
        address admin,
        address bouncerAdmin,
        address predicate,
        address childChainManager,
        uint8 chainIndex
    ) external {
        // @review check isContract?
        require(trustedForwarder.isContract(), "TRUSTERFORWARDER_NOT_CONTRACT");
        require(predicate.isContract(), "PREDICATE_NOT_CONTRACT");
        require(childChainManager.isContract(), "CHILDCHAINMANAGER_NOT_CONTRACT");
        initV2(trustedForwarder, admin, bouncerAdmin, predicate, chainIndex);
        _childChainManager = childChainManager;
    }

    /// @notice called when tokens are deposited on root chain
    /// @dev Should be callable only by ChildChainManager
    /// @dev Should handle deposit by minting the required tokens for user
    /// @dev Make sure minting is done only by this function
    /// @param user user address for whom deposit is being done
    /// @param depositData abi encoded ids array and amounts array
    function deposit(address user, bytes calldata depositData) external onlyDepositor {
        require(user != address(0), "INVALID_DEPOSIT_USER");
        (uint256[] memory ids, uint256[] memory amounts, bytes memory data) =
            abi.decode(depositData, (uint256[], uint256[], bytes));
        address sender = _msgSender();
        for (uint256 i = 0; i < ids.length; i++) {
            // ERC-721
            if ((amounts[i] == 1) && (ids[i] & IS_NFT > 0)) {
                bytes32 dummyHash = bytes32("0x00");
                uint8 rarity = 0;
                _mint(dummyHash, amounts[i], rarity, sender, user, ids[0], data, false);
            }
            // ERC-1155
            else {
                bytes32 dummyHash = bytes32("0x00");
                uint8 rarity = 0;
                _mint(dummyHash, amounts[i], rarity, sender, user, ids[0], data, false);
            }
        }
    }

    /// @notice called when user wants to withdraw single token back to root chain
    /// @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
    /// @param id id to withdraw
    /// @param amount amount to withdraw
    function withdrawSingle(uint256 id, uint256 amount) external {
        _burn(_msgSender(), id, amount);
        // emit ChainExit()
    }

    /// @notice Throws if called by any address other than depositor
    modifier onlyDepositor() {
        require(_msgSender() == _childChainManager, "!DEPOSITOR");
        _;
    }
}
