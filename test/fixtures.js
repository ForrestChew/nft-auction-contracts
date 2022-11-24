const deployNftFactoryFixture = async () => {
  const [nftFactoryDeployer] = await ethers.getSigners();
  const NftFactory = await ethers.getContractFactory('NftFactory');
  const nftFactory = await NftFactory.deploy('TestToken', 'TT');

  return { nftFactory, nftFactoryDeployer };
};

const deployNftAuctionFixture = async () => {
  const listingFee = ethers.utils.parseEther('0.1');
  const [auctionOwner, randAccount_1] = await ethers.getSigners();
  const NftAuction = await ethers.getContractFactory('NftAuction');
  const nftAuction = await NftAuction.deploy(auctionOwner.address, listingFee);

  return { nftAuction, auctionOwner, randAccount_1 };
};

const contractFixtures = async () => {
  const { nftFactory, nftFactoryDeployer } = await deployNftFactoryFixture();
  const { nftAuction, auctionOwner, randAccount_1 } =
    await deployNftAuctionFixture();
  return {
    nftFactory,
    nftFactoryDeployer,
    nftAuction,
    auctionOwner,
    randAccount_1,
  };
};

const createSingleNftAndApproveAuction = async () => {
  const { nftAuction, nftFactory, randAccount_1 } = await contractFixtures();
  const tokenUri = 'https://testtokenuri.uri';
  await nftFactory.connect(randAccount_1).createCollectable(tokenUri);
  const tokenId = 1;
  await nftFactory.connect(randAccount_1).approve(nftAuction.address, tokenId);

  return { nftFactory, nftAuction, randAccount_1 };
};

const createMultipleNftsAndApproveAuction = async () => {
  const { nftAuction, nftFactory, randAccount_1 } = await contractFixtures();
  const tokenUri = 'https://testtokenuri.uri';
  for (let i = 0; i < 5; i++) {
    const tokenId = i + 1;
    await nftFactory.connect(randAccount_1).createCollectable(tokenUri);
    await nftFactory
      .connect(randAccount_1)
      .approve(nftAuction.address, tokenId);
  }
  return { nftFactory, nftAuction, randAccount_1 };
};

const listMultipleNftsForAuction = async () => {
  const { nftAuction, nftFactory, randAccount_1 } =
    await createMultipleNftsAndApproveAuction();
  const startingPrice = ethers.utils.parseEther('1');
  const listingFee = ethers.utils.parseEther('0.1');
  for (let i = 0; i < 3; i++) {
    const tokenId = i + 1;
    await nftAuction
      .connect(randAccount_1)
      .listNft(nftFactory.address, tokenId, startingPrice, {
        value: listingFee,
      });
  }

  return { nftAuction, nftFactory, randAccount_1 };
};

module.exports = {
  deployNftFactoryFixture,
  contractFixtures,
  createSingleNftAndApproveAuction,
  createMultipleNftsAndApproveAuction,
  listMultipleNftsForAuction,
};
