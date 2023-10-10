// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {IMultiRoyaltyRecipients} from "./IMultiRoyaltyRecipients.sol";
import {IRoyaltiesProvider} from "../interfaces/IRoyaltiesProvider.sol";
import {LibRoyalties2981} from "../royalties/LibRoyalties2981.sol";
import {LibPart} from "../lib-part/LibPart.sol";
import {IERC2981} from "../royalties/IERC2981.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title royalties registry contract
/// @notice contract allows to processing different types of royalties
contract RoyaltiesRegistry is IRoyaltiesProvider, OwnableUpgradeable {
    /// @notice deprecated
    /// @param token deprecated
    /// @param tokenId deprecated
    /// @param royalties deprecated
    event RoyaltiesSetForToken(address indexed token, uint256 indexed tokenId, LibPart.Part[] royalties);

    /// @notice emitted when royalties is set for token
    /// @param token token address
    /// @param royalties array of royalties
    event RoyaltiesSetForContract(address indexed token, LibPart.Part[] royalties);

    /// @dev struct to store royalties in royaltiesByToken
    struct RoyaltiesSet {
        bool initialized;
        LibPart.Part[] royalties;
    }

    bytes4 internal constant INTERFACE_ID_GET_RECIPIENTS = 0xfd90e897;

    /// @notice deprecated
    mapping(bytes32 => RoyaltiesSet) public royaltiesByTokenAndTokenId;

    /// @notice stores royalties for token contract, set in setRoyaltiesByToken() method
    mapping(address => RoyaltiesSet) public royaltiesByToken;

    /// @notice stores external provider and royalties type for token contract
    /// @return royaltiesProviders external providers
    mapping(address => uint256) public royaltiesProviders;

    uint256 internal constant ROYALTIES_TYPE_UNSET = 0;
    uint256 internal constant ROYALTIES_TYPE_BY_TOKEN = 1;
    uint256 internal constant ROYALTIES_TYPE_EXTERNAL_PROVIDER = 2;
    uint256 internal constant ROYALTIES_TYPE_EIP2981 = 3;
    uint256 internal constant ROYALTIES_TYPE_UNSUPPORTED_NONEXISTENT = 4;
    uint256 internal constant ROYALTIES_TYPES_AMOUNT = 4;
    uint256 internal constant BASIS_POINTS = 10000;

    /// @dev this protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Royalties registry initializer
    // solhint-disable-next-line func-name-mixedcase
    function __RoyaltiesRegistry_init() external initializer {
        __Ownable_init();
    }

    /// @notice sets external provider for token contract, and royalties type = 4
    /// @param token token address
    /// @param provider address of provider
    function setProviderByToken(address token, address provider) external {
        _checkOwner(token);
        _setRoyaltiesType(token, ROYALTIES_TYPE_EXTERNAL_PROVIDER, provider);
    }

    /// @notice returns royalties type for token contract
    /// @param token token address
    /// @return royalty type
    function getRoyaltiesType(address token) external view returns (uint256) {
        return _getRoyaltiesType(royaltiesProviders[token]);
    }

    /// @notice returns provider address for token contract from royaltiesProviders mapping
    /// @param token token address
    /// @return address of provider
    function getProvider(address token) public view returns (address) {
        return address(uint160(royaltiesProviders[token]));
    }

    /// @notice clears and sets new royalties type for token contract
    /// @param token address of token
    /// @param royaltiesType roayalty type
    function forceSetRoyaltiesType(address token, uint256 royaltiesType) external {
        _checkOwner(token);
        _setRoyaltiesType(token, royaltiesType, getProvider(token));
    }

    /// @notice clears royalties type for token contract
    /// @param token address of token
    function clearRoyaltiesType(address token) external {
        _checkOwner(token);
        royaltiesProviders[token] = uint(uint160(getProvider(token)));
    }

    /// @notice sets royalties for token contract in royaltiesByToken mapping and royalties type = 1
    /// @param token address of token
    /// @param royalties array of royalties
    function setRoyaltiesByToken(address token, LibPart.Part[] memory royalties) external {
        _checkOwner(token);
        //clearing royaltiesProviders value for the token
        delete royaltiesProviders[token];
        // setting royaltiesType = 1 for the token
        _setRoyaltiesType(token, 1, address(0));
        uint256 sumRoyalties = 0;
        delete royaltiesByToken[token];
        for (uint256 i = 0; i < royalties.length; ++i) {
            require(royalties[i].account != address(0x0), "RoyaltiesByToken recipient should be present");
            require(royalties[i].value != 0, "Royalty value for RoyaltiesByToken should be > 0");
            royaltiesByToken[token].royalties.push(royalties[i]);
            sumRoyalties += royalties[i].value;
        }
        require(sumRoyalties < BASIS_POINTS, "Set by token royalties sum more, than 100%");
        royaltiesByToken[token].initialized = true;
        emit RoyaltiesSetForContract(token, royalties);
    }

    /// @notice returns royalties type from uint
    /// @param data in uint256
    /// @return royalty type
    function _getRoyaltiesType(uint256 data) internal pure returns (uint256) {
        for (uint256 i = 1; i <= ROYALTIES_TYPES_AMOUNT; ++i) {
            if (data / 2 ** (256 - i) == 1) {
                return i;
            }
        }
        return ROYALTIES_TYPE_UNSET;
    }

    /// @notice sets royalties type for token contract
    /// @param token address of token
    /// @param royaltiesType uint256 of royalty type
    /// @param royaltiesProvider address of royalty provider
    function _setRoyaltiesType(address token, uint256 royaltiesType, address royaltiesProvider) internal {
        require(royaltiesType > 0 && royaltiesType <= ROYALTIES_TYPES_AMOUNT, "wrong royaltiesType");
        royaltiesProviders[token] = uint(uint160(royaltiesProvider)) + 2 ** (256 - royaltiesType);
    }

    /// @notice checks if msg.sender is owner of this contract or owner of the token contract
    /// @param token address of token
    function _checkOwner(address token) internal view {
        if ((owner() != _msgSender()) && (OwnableUpgradeable(token).owner() != _msgSender())) {
            revert("Token owner not detected");
        }
    }

    /// @notice calculates royalties type for token contract
    /// @param token address of token
    /// @param royaltiesProvider address of royalty provider
    /// @return royalty type
    function _calculateRoyaltiesType(address token, address royaltiesProvider) internal view returns (uint256) {
        try IERC165Upgradeable(token).supportsInterface(LibRoyalties2981._INTERFACE_ID_ROYALTIES) returns (
            bool result2981
        ) {
            if (result2981) {
                return ROYALTIES_TYPE_EIP2981;
            }
            // solhint-disable-next-line no-empty-blocks
        } catch {}

        if (royaltiesProvider != address(0)) {
            return ROYALTIES_TYPE_EXTERNAL_PROVIDER;
        }

        return ROYALTIES_TYPE_UNSUPPORTED_NONEXISTENT;
    }

    /// @notice returns royalties for token contract and token id
    /// @param token address of token
    /// @param tokenId id of token
    /// @return royalties in form of an array of Parts
    function getRoyalties(address token, uint256 tokenId) external override returns (LibPart.Part[] memory) {
        uint256 royaltiesProviderData = royaltiesProviders[token];

        address royaltiesProvider = address(uint160(royaltiesProviderData));
        uint256 royaltiesType = _getRoyaltiesType(royaltiesProviderData);

        // case when royaltiesType is not set
        if (royaltiesType == ROYALTIES_TYPE_UNSET) {
            // calculating royalties type for token
            royaltiesType = _calculateRoyaltiesType(token, royaltiesProvider);

            //saving royalties type
            _setRoyaltiesType(token, royaltiesType, royaltiesProvider);
        }

        //case royaltiesType = 1, royalties are set in royaltiesByToken
        if (royaltiesType == ROYALTIES_TYPE_BY_TOKEN) {
            return royaltiesByToken[token].royalties;
        }

        //case royaltiesType = 2, royalties from external provider
        if (royaltiesType == ROYALTIES_TYPE_EXTERNAL_PROVIDER) {
            return _providerExtractor(token, tokenId, royaltiesProvider);
        }

        //case royaltiesType = 3, royalties EIP-2981
        if (royaltiesType == ROYALTIES_TYPE_EIP2981) {
            return _getRoyaltiesEIP2981(token, tokenId);
        }

        // case royaltiesType = 4, unknown/empty royalties
        return new LibPart.Part[](0);
    }

    /// @notice tries to get royalties EIP-2981 for token and tokenId
    /// @param token address of token
    /// @param tokenId id of token
    /// @return royalties 2981 royalty array
    function _getRoyaltiesEIP2981(
        address token,
        uint256 tokenId
    ) internal view returns (LibPart.Part[] memory royalties) {
        try IERC2981(token).royaltyInfo(tokenId, LibRoyalties2981._WEIGHT_VALUE) returns (
            address receiver,
            uint256 royaltyAmount
        ) {
            try IERC165Upgradeable(token).supportsInterface(INTERFACE_ID_GET_RECIPIENTS) returns (bool result) {
                if (result) {
                    try IMultiRoyaltyRecipients(token).getRecipients(tokenId) returns (
                        IMultiRoyaltyRecipients.Recipient[] memory multiRecipients
                    ) {
                        uint256 multiRecipientsLength = multiRecipients.length;
                        royalties = new LibPart.Part[](multiRecipientsLength);
                        uint256 sum = 0;
                        for (uint256 i; i < multiRecipientsLength; i++) {
                            IMultiRoyaltyRecipients.Recipient memory splitRecipient = multiRecipients[i];
                            royalties[i].account = splitRecipient.recipient;
                            uint256 splitAmount = (splitRecipient.bps * royaltyAmount) / LibRoyalties2981._WEIGHT_VALUE;
                            royalties[i].value = uint96(splitAmount);
                            sum += splitAmount;
                        }
                        // sum can be less than amount, otherwise small-value listings can break
                        require(sum <= royaltyAmount, "RoyaltiesRegistry: Invalid split");
                        return royalties;
                    } catch {
                        return LibRoyalties2981.calculateRoyalties(receiver, royaltyAmount);
                    }
                } else {
                    return LibRoyalties2981.calculateRoyalties(receiver, royaltyAmount);
                }
            } catch {
                return LibRoyalties2981.calculateRoyalties(receiver, royaltyAmount);
            }
        } catch {
            return new LibPart.Part[](0);
        }
    }

    /// @notice tries to get royalties for token and tokenId from external provider set in royaltiesProviders
    /// @param token address of token
    /// @param tokenId id of token
    /// @param providerAddress address of external provider
    /// @return external royalties
    function _providerExtractor(
        address token,
        uint256 tokenId,
        address providerAddress
    ) internal returns (LibPart.Part[] memory) {
        try IRoyaltiesProvider(providerAddress).getRoyalties(token, tokenId) returns (LibPart.Part[] memory result) {
            return result;
        } catch {
            return new LibPart.Part[](0);
        }
    }

    uint256[46] private __gap;
}
