// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AuctionItems/AuctionItemStorage.sol";
import "./Settlements.sol";

contract NftAuction is Ownable, AuctionItemStorage, Settlements {
    enum AuctionState {
        INACTIVE,
        ACTIVE
    }

    AuctionState public auctionState;

    address public auctionOwner;
    uint256 public listingFee;
    uint256 public biddingFee;

    event AuctionNft(
        address seller,
        address tokenFactAddr,
        uint256 tokenId,
        uint256 price
    );
    event NewPrice(uint256 tokenId, uint256 price, uint256 newPrice);
    event AuctionStatus(bool auctionStatus);
    event NewBid(
        uint256 tokenId,
        uint256 oldPrice,
        uint256 newPrice,
        address bidder
    );

    modifier onlyActive() {
        require(auctionState == AuctionState.ACTIVE, "Auction must be ACTIVE");
        _;
    }

    modifier onlyInactive() {
        require(
            auctionState == AuctionState.INACTIVE,
            "Auction must be INACTIVE"
        );
        _;
    }

    modifier onlyLister(bytes32 key) {
        require(msg.sender == _nodes[key].nftListing.seller, "Only Lister");
        _;
    }

    constructor(
        address _auctionOwner,
        uint256 _listingFee,
        uint256 _biddingFee
    ) {
        auctionOwner = _auctionOwner;
        listingFee = _listingFee;
        biddingFee = _biddingFee;
    }

    function listNft(
        address tokenFactAddr,
        uint256 tokenId,
        uint256 price
    ) external payable onlyInactive {
        require(msg.value == listingFee, "listNft: Incorrect amount");
        _pushToStack(tokenFactAddr, tokenId, price);
        IERC721(tokenFactAddr).transferFrom(msg.sender, address(this), tokenId);
        emit AuctionNft(msg.sender, tokenFactAddr, tokenId, price);
    }

    function delistNft(address tokenFactAddr, bytes32 key)
        external
        onlyLister(key)
        onlyInactive
    {
        uint256 tokenId = _nodes[key].nftListing.tokenId;
        uint256 price = _nodes[key].nftListing.price;
        _removeStackItem(key);
        IERC721(tokenFactAddr).transferFrom(address(this), msg.sender, tokenId);
        emit AuctionNft(msg.sender, tokenFactAddr, tokenId, price);
    }

    function changeNftPrice(bytes32 key, uint256 newPrice)
        external
        onlyLister(key)
        onlyInactive
    {
        uint256 price = _nodes[key].nftListing.price;
        uint256 tokenId = _nodes[key].nftListing.tokenId;
        _changeNftListingPrice(key, newPrice);
        emit NewPrice(tokenId, price, newPrice);
    }

    function startAuction() external onlyOwner onlyInactive {
        require(stackSize > 0, "startAuction: No listings");
        auctionState = AuctionState.ACTIVE;
        emit AuctionStatus(true);
    }

    function endAuction() external onlyOwner onlyActive {
        require(stackSize == 0, "endAuction: auction has not ended");
        auctionState = AuctionState.INACTIVE;
        emit AuctionStatus(false);
    }

    function bidOnNft(uint256 bid) external payable onlyActive {
        Node memory listing = _getTopOfStack();
        uint256 currentPrice = listing.nftListing.price;
        require(msg.value == biddingFee, "bidOnNft: Needs bid fee");
        require(bid > currentPrice, "bidOnNft: Bid must be > curPrice");
        _balances[msg.sender] += msg.value;
        bytes32 listingKey = listing.key;
        _changeNftListingKeeper(listingKey, msg.sender);
        _changeNftListingPrice(listingKey, bid);
        uint256 tokenId = listing.nftListing.tokenId;
        emit NewBid(tokenId, currentPrice, bid, msg.sender);
    }

    function auctionNextNft() external onlyOwner onlyActive {
        Node memory listing = _getTopOfStack();
        uint256 startTime = listing.nftListing.startTime;
        require(
            block.timestamp > startTime + 15 minutes,
            "auctionNextNft: Not enough time has ellapsed"
        );
        _nftToSeller(listing);
        _popFromStack();
        Node memory nextListing = _getTopOfStack();
        emit AuctionNft(
            nextListing.nftListing.seller,
            nextListing.nftListing.tokenFactAddr,
            nextListing.nftListing.tokenId,
            nextListing.nftListing.price
        );
    }

    function changeListingFee(uint256 newFee) external onlyOwner onlyInactive {
        listingFee = newFee;
    }

    function _nftToSeller(Node memory listing) private {
        address nftkeeper = listing.nftListing.keeper;
        if (nftkeeper == address(this)) {
            address tokenFactAddr = listing.nftListing.tokenFactAddr;
            uint256 tokenId = listing.nftListing.tokenId;
            address nftSeller = listing.nftListing.seller;
            IERC721(tokenFactAddr).transferFrom(
                address(this),
                nftSeller,
                tokenId
            );
        }
    }

    function getCurrentNft() external view returns (Node memory) {
        return _getTopOfStack();
    }

    function getAllListings() external view returns (Node[] memory) {
        return _getStackItems();
    }
}
