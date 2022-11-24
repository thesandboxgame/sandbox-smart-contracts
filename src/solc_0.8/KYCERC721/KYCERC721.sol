//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IERC721NonTransferable} from "../common/interfaces/IERC721NonTransferable.sol";
import {StringsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";

/// @title This contract is for a NON-TRANSFERABLE KYCERC721 token which can be minted by admin with a minter role.
/// @dev The following roles are used in this contract: DEFAULT_ADMIN_ROLE, MINTER_ROLE, BURNER_ROLE.
/// @dev KYCERC721 will be minted only on L2.
/// @dev This contract is final, don't inherit from it.
contract KYCERC721 is AccessControlUpgradeable, ERC721Upgradeable, IERC721NonTransferable {
    using StringsUpgradeable for uint256;

    uint256[50] private __gap1; // In case

    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    string internal _baseTokenURI;

    // solhint-disable-next-line no-empty-blocks
    constructor() initializer {}

    /// @notice fulfills the purpose of a constructor in upgradeable contracts
    function initialize(
        address admin,
        address backendKYCWallet,
        string memory uri
    ) public initializer {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, backendKYCWallet);
        _grantRole(BURNER_ROLE, admin);
        __ERC721_init("Sandbox's KYC ERC721", "KYC");
        _baseTokenURI = uri;
    }

    /// @notice Creates a new token for `to`.
    /// @dev Minting is only permitted to MINTER_ROLE.
    /// @param to The address that will receive the new token.
    /// @param id The id of the new token.
    function mint(address to, uint256 id) public override(IERC721NonTransferable) onlyRole(MINTER_ROLE) {
        require(balanceOf(to) == 0, "KYCERC721_ISSUED");
        _safeMint(to, id);
    }

    /// @notice Creates a new token for `to`.
    /// @dev Minting is only permitted to MINTER_ROLE.
    /// @param to The address that will receive the new token.
    /// @param id The id of the new token.
    /// @param data Optional data.
    function mint(
        address to,
        uint256 id,
        bytes calldata data
    ) public override(IERC721NonTransferable) onlyRole(MINTER_ROLE) {
        require(balanceOf(to) == 0, "KYCERC721_ISSUED");
        _safeMint(to, id, data);
    }

    /// @notice A distinct Uniform Resource Identifier (URI) for a given token.
    /// @param tokenId The tokenId to get the uri of.
    /// @return URI The token's full URI string.
    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable) returns (string memory) {
        require(ownerOf(tokenId) != address(0), "ZERO_ADDRESS");
        require(_exists(tokenId), "INVALID_TOKEN");
        string memory uri = _baseURI();
        return bytes(uri).length > 0 ? string(abi.encodePacked(uri, tokenId.toString())) : "";
    }

    /// @notice Set the base for the token URI.
    /// @dev It is intended that only admin may set the base token URI.
    /// @param uri The string for the base URI.
    function setBaseURI(string memory uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = uri;
    }

    /// @notice View the base for the token URI.
    function baseURI() external view returns (string memory) {
        return _baseURI();
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

    /// @notice Query if token exists with `id`.
    /// @param id the token ID to query.
    /// @return `true` if the token already exists.
    function exists(uint256 id) public view returns (bool) {
        return _exists(id);
    }

    /// @notice Burns token with given `id`.
    /// @dev Intended that users can burn their own tokens.
    /// @param id The id of the token to be burned.
    function burn(uint256 id) public override(IERC721NonTransferable) {
        require(_msgSender() == ERC721Upgradeable.ownerOf(id), "NOT_OWNER");
        _burn(id);
    }

    /// @notice Burns token with given `id`.
    /// @dev Intended that admin with BURNER_ROLE has the right to burn user tokens.
    /// @param from Address whose token is to be burned.
    /// @param id Token id which will be burned.
    function burnFrom(address from, uint256 id) public override(IERC721NonTransferable) onlyRole(BURNER_ROLE) {
        require(from == ERC721Upgradeable.ownerOf(id), "NOT_OWNER");
        _burn(id);
    }

    /// @notice Internal function for viewing the baseURI.
    /// @dev Overrides ERC721Upgradeable which returns "".
    function _baseURI() internal view override(ERC721Upgradeable) returns (string memory) {
        return _baseTokenURI;
    }

    /// @notice Modified _beforeTokenTransfer hook ensures tokens are non-transferable.
    /// @dev It is intended that tokens cannot be transferred after being minted, unless burned.
    /// @param _from owner of token id.
    /// @param _to intended recipient of token id.
    /// @param _tokenId the token id to be transferred.
    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _tokenId
    ) internal override(ERC721Upgradeable) {
        require(_from == address(0) || _to == address(0), "NOT_TRANSFERABLE");
        super._beforeTokenTransfer(_from, _to, _tokenId);
    }

    uint256[50] private __gap2; // In case
}
