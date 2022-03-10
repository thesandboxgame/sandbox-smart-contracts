//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IMintableERC721} from "../common/interfaces/@maticnetwork/pos-portal/root/RootToken/IMintableERC721.sol";
import {IAssetERC721Minter} from "../common/interfaces/IAssetERC721Minter.sol";

abstract contract AssetBaseERC721 is AccessControlUpgradeable, ERC721Upgradeable, IMintableERC721, IAssetERC721Minter {
    address internal _trustedForwarder;

    bytes32 public constant MINTER = keccak256("MINTER");

    function init(address trustedForwarder, address admin) public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _trustedForwarder = trustedForwarder;
        // __ERC721_init("Sandbox's Assets", "ASSET");
    }

    /// @notice Mint an ERC721 Asset with the provided id.
    /// @dev Should be callable only by MintableERC721Predicate on L1.
    /// @param to Address that will receive the token.
    /// @param id ERC721 id to be used.
    function mint(address to, uint256 id)
        external
        virtual
        override(IMintableERC721, IAssetERC721Minter)
        onlyRole(MINTER)
    {
        _safeMint(to, id);
    }

    /// @notice Mint an ERC721 Asset with the provided id.
    /// @dev Should be callable only by MintableERC721Predicate on L1.
    /// @dev If you want to retain token metadata from L2 to L1 during exit, you must implement this method.
    /// @param to Address that will receive the token.
    /// @param id ERC721 id to be used.
    /// @param metaData Associated token metadata, to be decoded & set using `setTokenMetadata`.
    function mint(
        address to,
        uint256 id,
        bytes calldata metaData
    ) external virtual override(IMintableERC721, IAssetERC721Minter) onlyRole(MINTER) {
        _safeMint(to, id, metaData);
    }

    // TODO: look at setApprovalForAllFrom

    /// @notice Burns token with given `id`.
    /// @param from Address whose token is to be burned.
    /// @param id Token id which will be burned.
    function burnFrom(address from, uint256 id) external {
        require(from == _msgSender() || isApprovedForAll(from, _msgSender()), "!AUTHORIZED");
        _burn(id);
    }

    /// @notice Transfer token with given id.
    /// @dev Required by IMintableERC721.
    /// @param from Address whose token is to be transferred.
    /// @param to Recipient.
    /// @param tokenId The token id to be transferred.
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721Upgradeable, IMintableERC721) {
        ERC721Upgradeable.safeTransferFrom(from, to, tokenId);
    }

    /// @notice Query if a token id exists.
    /// @param tokenId Token id to be queried.
    function exists(uint256 tokenId) external view override returns (bool) {
        return _exists(tokenId);
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param id the interface identifier, as specified in ERC-165.
    /// @return `true` if the contract implements `id`.
    function supportsInterface(bytes4 id)
        public
        view
        override(AccessControlUpgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(id);
    }

    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == _trustedForwarder;
    }

    function getTrustedForwarder() external view returns (address trustedForwarder) {
        return _trustedForwarder;
    }

    function _msgSender() internal view virtual override returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            // solhint-disable-next-line no-inline-assembly
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return msg.sender;
        }
    }

    function _msgData() internal view virtual override returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return msg.data;
        }
    }

    uint256[50] private __gap;
}
