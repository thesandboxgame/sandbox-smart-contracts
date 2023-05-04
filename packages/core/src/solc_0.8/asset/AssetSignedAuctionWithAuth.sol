//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {IERC20} from "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts-0.8/security/ReentrancyGuard.sol";
import {SigUtil} from "../common/Libraries/SigUtil.sol";
import {PriceUtil} from "../common/Libraries/PriceUtil.sol";
import {TheSandbox712} from "../common/Base/TheSandbox712.sol";
import {MetaTransactionReceiver} from "../common/BaseWithStorage/MetaTransactionReceiver.sol";
import {ERC1271} from "../common/interfaces/ERC1271.sol";
import {ERC1271Constants} from "../common/interfaces/ERC1271Constants.sol";
import {ERC1654} from "../common/interfaces/ERC1654.sol";
import {ERC1654Constants} from "../common/interfaces/ERC1654Constants.sol";
import {IAuthValidator} from "../common/interfaces/IAuthValidator.sol";
import {IERC1155} from "../common/interfaces/IERC1155.sol";

contract AssetSignedAuctionWithAuth is
    ReentrancyGuard,
    ERC1654Constants,
    ERC1271Constants,
    TheSandbox712,
    MetaTransactionReceiver
{
    struct ClaimSellerOfferRequest {
        address buyer;
        address payable seller;
        address token;
        uint256[] purchase;
        uint256[] auctionData;
        uint256[] ids;
        uint256[] amounts;
        bytes signature;
        bytes backendSignature;
    }

    enum SignatureType {DIRECT, EIP1654, EIP1271}

    bytes32 public constant BACKEND_TYPEHASH =
        keccak256(
            "Auction(address to,address from,address token,bytes auctionData,bytes ids,bytes amounts,bytes purchase)"
        );

    bytes32 public constant AUCTION_TYPEHASH =
        keccak256("Auction(address from,address token,bytes auctionData,bytes ids,bytes amounts)");

    event OfferClaimed(
        address indexed seller,
        address indexed buyer,
        uint256 indexed offerId,
        uint256 amount,
        uint256 pricePaid,
        uint256 feePaid
    );
    event OfferCancelled(address indexed seller, uint256 indexed offerId);
    event NewFeeLimit(uint256 feeLimit);

    uint256 public constant MAX_UINT256 = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    // Stack too deep, grouping parameters
    // AuctionData:
    uint256 public constant AuctionData_OfferId = 0;
    uint256 public constant AuctionData_StartingPrice = 1;
    uint256 public constant AuctionData_EndingPrice = 2;
    uint256 public constant AuctionData_StartedAt = 3;
    uint256 public constant AuctionData_Duration = 4;
    uint256 public constant AuctionData_Packs = 5;

    mapping(address => mapping(uint256 => uint256)) public claimed;

    IAuthValidator public _authValidator;
    IERC1155 public _asset;
    uint256 public _fee10000th = 0;
    uint256 public _feeLimit = 500;
    uint256 public _maxfeeLimit = 500; // 5%
    address payable public _feeCollector;

    event FeeSetup(address feeCollector, uint256 fee10000th);

    constructor(
        IERC1155 asset,
        address admin,
        address initialMetaTx,
        address payable feeCollector,
        uint256 fee10000th,
        address authValidator
    ) TheSandbox712() {
        require(fee10000th <= _feeLimit, "Fee above the limit");
        _asset = asset;
        _feeCollector = feeCollector;
        _fee10000th = fee10000th;
        emit FeeSetup(feeCollector, fee10000th);
        _admin = admin;
        _setMetaTransactionProcessor(initialMetaTx, true);
        _authValidator = IAuthValidator(authValidator);
    }

    // check backend signature to avoid front-running
    modifier isAuthValid(bytes memory signature, bytes32 hashedData) {
        require(_authValidator.isAuthValid(signature, hashedData), "INVALID_AUTH");
        _;
    }

    /// @notice set fee parameters
    /// @param feeCollector address receiving the fee
    /// @param fee10000th fee in 10,000th
    function setFee(address payable feeCollector, uint256 fee10000th) external {
        require(feeCollector != address(0), "feeCollector cannot be Zero address");
        require(msg.sender == _admin, "only admin can change fee");
        require(fee10000th <= _feeLimit, "Fee above the limit");
        _feeCollector = feeCollector;
        _fee10000th = fee10000th;
        emit FeeSetup(feeCollector, fee10000th);
    }

    /// @notice setFeeLimit parameters
    /// @param newFeeLimit new fee limit
    function setFeeLimit(uint256 newFeeLimit) external {
        require(msg.sender == _admin, "only admin can change fee limit");
        require(newFeeLimit <= _maxfeeLimit, "new limit above max limit");

        _feeLimit = newFeeLimit;

        emit NewFeeLimit(newFeeLimit);
    }

    /// @notice claim offer using EIP712
    /// @param input Claim Seller Offer Request
    function claimSellerOffer(ClaimSellerOfferRequest memory input)
        external
        payable
        isAuthValid(
            input.backendSignature,
            _hashBackendSig(
                input.buyer,
                input.seller,
                input.token,
                input.auctionData,
                input.ids,
                input.amounts,
                input.purchase
            )
        )
    {
        _verifyParameters(
            input.buyer,
            input.seller,
            input.token,
            input.purchase[0],
            input.auctionData,
            input.ids,
            input.amounts
        );
        _ensureCorrectSigner(
            input.seller,
            input.token,
            input.auctionData,
            input.ids,
            input.amounts,
            input.signature,
            SignatureType.DIRECT
        );
        _executeDeal(
            input.token,
            input.purchase,
            input.buyer,
            input.seller,
            input.auctionData,
            input.ids,
            input.amounts
        );
    }

    /// @notice claim offer using EIP712 and EIP1271 signature verification scheme
    /// @param input Claim Seller Offer Request
    function claimSellerOfferViaEIP1271(ClaimSellerOfferRequest memory input)
        external
        payable
        isAuthValid(
            input.backendSignature,
            _hashBackendSig(
                input.buyer,
                input.seller,
                input.token,
                input.auctionData,
                input.ids,
                input.amounts,
                input.purchase
            )
        )
    {
        _verifyParameters(
            input.buyer,
            input.seller,
            input.token,
            input.purchase[0],
            input.auctionData,
            input.ids,
            input.amounts
        );
        _ensureCorrectSigner(
            input.seller,
            input.token,
            input.auctionData,
            input.ids,
            input.amounts,
            input.signature,
            SignatureType.EIP1271
        );
        _executeDeal(
            input.token,
            input.purchase,
            input.buyer,
            input.seller,
            input.auctionData,
            input.ids,
            input.amounts
        );
    }

    /// @notice claim offer using EIP712 and EIP1654 signature verification scheme
    /// @param input Claim Seller Offer Request
    function claimSellerOfferViaEIP1654(ClaimSellerOfferRequest memory input)
        external
        payable
        isAuthValid(
            input.backendSignature,
            _hashBackendSig(
                input.buyer,
                input.seller,
                input.token,
                input.auctionData,
                input.ids,
                input.amounts,
                input.purchase
            )
        )
    {
        _verifyParameters(
            input.buyer,
            input.seller,
            input.token,
            input.purchase[0],
            input.auctionData,
            input.ids,
            input.amounts
        );
        _ensureCorrectSigner(
            input.seller,
            input.token,
            input.auctionData,
            input.ids,
            input.amounts,
            input.signature,
            SignatureType.EIP1654
        );
        _executeDeal(
            input.token,
            input.purchase,
            input.buyer,
            input.seller,
            input.auctionData,
            input.ids,
            input.amounts
        );
    }

    /// @notice cancel a offer previously signed, new offer need to use a id not used yet
    /// @param offerId offer to cancel
    function cancelSellerOffer(uint256 offerId) external {
        require(claimed[msg.sender][offerId] != MAX_UINT256, "Sell offer was already cancelled");
        claimed[msg.sender][offerId] = MAX_UINT256;
        emit OfferCancelled(msg.sender, offerId);
    }

    function _executeDeal(
        address token,
        uint256[] memory purchase,
        address buyer,
        address payable seller,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal nonReentrant {
        uint256 offer =
            PriceUtil.calculateCurrentPrice(
                auctionData[AuctionData_StartingPrice],
                auctionData[AuctionData_EndingPrice],
                auctionData[AuctionData_Duration],
                block.timestamp - auctionData[AuctionData_StartedAt]
            ) * purchase[0];
        claimed[seller][auctionData[AuctionData_OfferId]] =
            claimed[seller][auctionData[AuctionData_OfferId]] +
            purchase[0];

        uint256 fee = 0;
        if (_fee10000th > 0) {
            fee = PriceUtil.calculateFee(offer, _fee10000th);
        }

        uint256 total = offer + fee;
        require(total <= purchase[1], "offer exceeds max amount to spend");

        if (token != address(0)) {
            require(IERC20(token).transferFrom(buyer, seller, offer), "failed to transfer token price");
            if (fee > 0) {
                require(IERC20(token).transferFrom(buyer, _feeCollector, fee), "failed to collect fee");
            }
        } else {
            require(msg.value >= total, "ETH < total");
            if (msg.value > total) {
                Address.sendValue(payable(msg.sender), msg.value - total);
            }
            Address.sendValue(seller, offer);
            if (fee > 0) {
                Address.sendValue(_feeCollector, fee);
            }
        }

        uint256[] memory packAmounts = new uint256[](amounts.length);
        for (uint256 i = 0; i < packAmounts.length; i++) {
            packAmounts[i] = amounts[i] * purchase[0];
        }
        _asset.safeBatchTransferFrom(seller, buyer, ids, packAmounts, "");
        emit OfferClaimed(seller, buyer, auctionData[AuctionData_OfferId], purchase[0], offer, fee);
    }

    function _ensureCorrectSigner(
        address from,
        address token,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory signature,
        SignatureType signatureType
    ) internal view {
        bytes memory dataToHash;

        dataToHash = abi.encodePacked(
            "\x19\x01",
            _DOMAIN_SEPARATOR,
            _hashAuction(from, token, auctionData, ids, amounts)
        );

        if (signatureType == SignatureType.EIP1271) {
            require(
                ERC1271(from).isValidSignature(dataToHash, signature) == ERC1271_MAGICVALUE,
                "invalid 1271 signature"
            );
        } else if (signatureType == SignatureType.EIP1654) {
            require(
                ERC1654(from).isValidSignature(keccak256(dataToHash), signature) == ERC1654_MAGICVALUE,
                "invalid 1654 signature"
            );
        } else {
            address signer = SigUtil.recover(keccak256(dataToHash), signature);
            require(signer == from, "signer != from");
        }
    }

    function _verifyParameters(
        address buyer,
        address payable seller,
        address token,
        uint256 buyAmount,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal view {
        require(ids.length == amounts.length, "ids and amounts length not matching");
        require(
            buyer == msg.sender || (token != address(0) && _metaTransactionContracts[msg.sender]),
            "not authorized"
        );
        uint256 amountAlreadyClaimed = claimed[seller][auctionData[AuctionData_OfferId]];
        require(amountAlreadyClaimed != MAX_UINT256, "Auction cancelled");

        uint256 total = amountAlreadyClaimed + buyAmount;
        require(total <= auctionData[AuctionData_Packs], "Buy amount exceeds sell amount");

        require(auctionData[AuctionData_StartedAt] <= block.timestamp, "Auction didn't start yet");
        require(
            auctionData[AuctionData_StartedAt] + auctionData[AuctionData_Duration] > block.timestamp,
            "Auction finished"
        );
    }

    function _hashAuction(
        address from,
        address token,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    AUCTION_TYPEHASH,
                    from,
                    token,
                    keccak256(abi.encodePacked(auctionData)),
                    keccak256(abi.encodePacked(ids)),
                    keccak256(abi.encodePacked(amounts))
                )
            );
    }

    function _hashBackendSig(
        address to,
        address from,
        address token,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts,
        uint256[] memory purchase
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    BACKEND_TYPEHASH,
                    to,
                    from,
                    token,
                    keccak256(abi.encodePacked(auctionData)),
                    keccak256(abi.encodePacked(ids)),
                    keccak256(abi.encodePacked(amounts)),
                    keccak256(abi.encodePacked(purchase))
                )
            );
    }
}
