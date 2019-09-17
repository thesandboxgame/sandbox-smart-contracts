pragma solidity 0.5.9;

import "../../../contracts_common/src/Libraries/SigUtil.sol";
import "../../../contracts_common/src/Libraries/PriceUtil.sol";
import "../Sand.sol";
import "../Asset.sol";
import "../../../contracts_common/src/Interfaces/ERC20.sol";
import "../TheSandbox712.sol";

contract AssetSignedAuction is TheSandbox712 {
    bytes32 constant AUCTION_TYPEHASH = keccak256(
        "Auction(address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)"
    );

    // TODO: review event values
    // TODO remove underscore
    event OfferClaimed(
        address indexed _seller,
        address indexed _buyer,
        address _token,
        uint256 _buyAmount,
        uint256[] _auctionData,
        uint256[] ids,
        uint256[] amounts,
        bytes _signature // TODO remove and use offerId
    );
    event OfferCancelled(address indexed _seller, uint256 _offerId);

    uint256 constant MAX_UINT256 = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    // Stack too deep, grouping parameters
    // AuctionData:
    uint256 constant AuctionData_OfferId = 0;
    uint256 constant AuctionData_StartingPrice = 1;
    uint256 constant AuctionData_EndingPrice = 2;
    uint256 constant AuctionData_StartedAt = 3;
    uint256 constant AuctionData_Duration = 4;
    uint256 constant AuctionData_Packs = 5;

    mapping(address => mapping(uint256 => uint256)) claimed;

    Asset asset;
    Sand sand;
    constructor(Sand _sand, Asset _asset) public {
        asset = _asset;
        sand = _sand;
        init712();
    }

    function claimSellerOffer(
        address buyer,
        address payable seller,
        address token,
        uint256 buyAmount,
        uint256[] calldata auctionData,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata signature
    ) external payable {
        require(
            msg.sender == buyer || msg.sender == address(sand),
            "invalid buyer"
        );

        // TODO: do we remove seller from the argument list? and recover it ?
        require(
            seller == recover(token, auctionData, ids, amounts, signature),
            "Signature mismatches"
        );

        require(
            claimed[seller][auctionData[AuctionData_OfferId]] != MAX_UINT256,
            "Auction cancelled"
        );
        require(
            SafeMath.add(
                    claimed[seller][auctionData[AuctionData_OfferId]],
                    buyAmount
                ) <=
                auctionData[AuctionData_Packs],
            "Buy amount exceeds sell amount"
        );

        require(
            auctionData[AuctionData_StartedAt] <= block.timestamp,
            "Auction didn't start yet"
        );
        require(
            auctionData[AuctionData_StartedAt] +
                    auctionData[AuctionData_Duration] >
                block.timestamp,
            "Auction finished"
        );

        _executeDeal(
            token,
            buyer,
            seller,
            auctionData,
            ids,
            amounts,
            buyAmount
        );
        emit OfferClaimed(
            seller,
            buyer,
            token,
            buyAmount,
            auctionData,
            ids,
            amounts,
            signature
        );
    }

    function _executeDeal(
        address token,
        address buyer,
        address payable seller,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts,
        uint256 buyAmount
    ) internal {
        uint256 offer = PriceUtil.calculateCurrentPrice(
                auctionData[AuctionData_StartingPrice],
                auctionData[AuctionData_EndingPrice],
                auctionData[AuctionData_Duration],
                block.timestamp - auctionData[AuctionData_StartedAt]
            ) *
            buyAmount;

        claimed[seller][auctionData[AuctionData_OfferId]] += buyAmount;

        if (token != address(0)) {
            ERC20(token).transferFrom(buyer, seller, offer); // require approval/ for SAND we can add it to the list of defaultOperators / superOperators
        } else {
            require(
                buyer == msg.sender,
                "for ETH based offers, the buyer need to be the sender"
            );
            require(msg.value >= offer, "not enough ETH"); // in case the aucction could store ETH for other reasons
            seller.transfer(offer);
            msg.sender.transfer(msg.value - offer);
        }

        uint256[] memory packAmounts = new uint256[](amounts.length);
        for (uint256 i = 0; i < packAmounts.length; i++) {
            packAmounts[i] = amounts[i] * buyAmount;
        }
        asset.safeBatchTransferFrom(seller, buyer, ids, packAmounts, "");
    }

    function cancelSellerOffer(uint256 offerId) external {
        claimed[msg.sender][offerId] = MAX_UINT256;

        emit OfferCancelled(msg.sender, offerId);
    }

    // Make public for testing
    function recover(
        address token,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory signature
    ) internal view returns (address) {
        return
            SigUtil.recover(
                // This recreates the message that was signed on the client.
                keccak256(
                    abi.encodePacked(
                        "\x19\x01",
                        domainSeparator(),
                        hashAuction(token, auctionData, ids, amounts)
                    )
                ),
                signature
            );
    }

    function hashAuction(
        address token,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    AUCTION_TYPEHASH,
                    token,
                    auctionData[AuctionData_OfferId],
                    auctionData[AuctionData_StartingPrice],
                    auctionData[AuctionData_EndingPrice],
                    auctionData[AuctionData_StartedAt],
                    auctionData[AuctionData_Duration],
                    auctionData[AuctionData_Packs],
                    keccak256(abi.encodePacked(ids)),
                    keccak256(abi.encodePacked(amounts))
                )
            );
    }
}
