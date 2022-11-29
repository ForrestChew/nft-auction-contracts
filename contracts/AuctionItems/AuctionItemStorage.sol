// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AuctionItemFactory.sol";
import "./PostBidAuctionItemStorage.sol";

contract AuctionItemStorage is AuctionItemFactory, PostBidAuctionItemStorage {
    struct Node {
        AuctionItem nftListing;
        bytes32 key;
        bytes32 next;
        bytes32 prev;
    }

    uint256 public stackSize;
    bytes32 private _topOfStackKey;
    mapping(bytes32 => Node) _nodes;

    /*
     * @notice - Adds a token ID to the stack.
     * @param tokenFactAddr - Contract address to which the Nft ID belongs.
     * @param _tokenId - Nft ID.
     * @param Price - Price to begin bidding on Nft.
     */
    function _pushToStack(
        address tokenFactAddr,
        uint256 tokenId,
        uint256 price
    ) internal {
        bytes32 nodeKey = bytes32(
            keccak256(
                abi.encodePacked(tokenFactAddr, tokenId, price, block.timestamp)
            )
        );
        if (_topOfStackKey != bytes32(0)) _nodes[_topOfStackKey].prev = nodeKey;
        _nodes[nodeKey] = Node({
            nftListing: AuctionItemFactory._createItem(
                tokenFactAddr,
                tokenId,
                price
            ),
            key: nodeKey,
            next: _topOfStackKey,
            prev: 0x0
        });
        _topOfStackKey = nodeKey;
        stackSize++;
    }

    function _popFromStack() internal {
        bytes32 topOfStackKeyTmp = _topOfStackKey;
        _topOfStackKey = _nodes[_topOfStackKey].next;
        PostBidAuctionItemStorage._addPostBidItemKey(topOfStackKeyTmp);
        stackSize--;
    }

    function _removeStackItem(bytes32 nodeKey) internal {
        _nodes[_nodes[nodeKey].prev].next = _nodes[nodeKey].next;
        _nodes[_nodes[nodeKey].next].prev = _nodes[nodeKey].prev;
        delete _nodes[nodeKey];
        stackSize--;
    }

    function _changeNftListingKeeper(bytes32 nodeKey, address newKeeper)
        internal
    {
        _nodes[nodeKey].nftListing.keeper = newKeeper;
    }

    function _changeNftListingPrice(bytes32 nodeKey, uint256 newPrice)
        internal
    {
        _nodes[nodeKey].nftListing.price = newPrice;
    }

    function _getTopOfStack() internal view returns (Node memory) {
        return _nodes[_topOfStackKey];
    }

    function _getStackItems() internal view returns (Node[] memory) {
        Node[] memory items = new Node[](stackSize);
        Node memory currNode = _nodes[_topOfStackKey];
        for (uint256 i = 0; i < items.length; i++) {
            items[i] = currNode;
            currNode = _nodes[currNode.next];
        }
        return items;
    }
}
