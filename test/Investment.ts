import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Investment", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployeFixture() {
    // Contracts are deployed using the first signer/account by default
    const accounts = await ethers.getSigners();
    const owner = accounts[0];
    const admin = accounts[1];
    const manager = accounts[2];
    const maxIndexEvent = 10;
    const decimals = 6;
    const id = 0;
    const eventBatchSize = 15;
    const isCancelDeposit = true;
    const isCancelWithdrawal = true;
    const depositFeeRate = 5000000;
    const performanceFeeRate = 20000000;
    const managementFeeRate = 2000000;
    const minDepositAmount = 1_000_000_000_000;
    const minDepositFee = 100_000_000;
    const maxDepositFee = 100_000_000_000_000;
    const tokenPrice = 100000000;
    const feeRate1 = 10000000;
    const feePeriod1 = 3600;
    const feeRate2 = 5000000;
    const feePeriod2 = 7200;
    const feeRate3 = 1000000;
    const feePeriod3 = 10800;

    const HoldTime = await ethers.getContractFactory("HoldTime");
    const holdTime = await HoldTime.deploy();
    const Token = await ethers.getContractFactory("contracts/common/Token.sol:Token");
    const token = await Token.deploy(
      "ALPHA",
      "ALPHA",
      holdTime.address,
      admin.address
    );
    holdTime.connect(owner).updateToken(token.address);

    const Proof = await ethers.getContractFactory("Proof");
    const depositProof = await Proof.deploy(
      "DALPHA",
      "DALPHA",
      1,
      admin.address
    );
    const WithdrawalProof = await ethers.getContractFactory("Proof");
    const withdrawalProof = await WithdrawalProof.deploy(
      "WALPHA",
      "WALPHA",
      0,
      admin.address
    );
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(admin.address);

    const Management = await ethers.getContractFactory("Management");
    const management = await Management.deploy(
      admin.address,
      manager.address,
      treasury.address
    );

    const AssetBook = await ethers.getContractFactory("AssetBook");
    const assetBook = await AssetBook.deploy(admin.address, manager.address);
    const SafeHouse = await ethers.getContractFactory("contracts/common/SafeHouse.sol:SafeHouse");
    const safeHouse = await SafeHouse.deploy(
      assetBook.address,
      admin.address,
      manager.address
    );

    const StableToken = await ethers.getContractFactory("StableToken");
    const stableToken = await StableToken.deploy(decimals);

    const Investment = await ethers.getContractFactory("Investment");
    const investment = await Investment.deploy(
      id,
      stableToken.address,
      token.address,
      management.address,
      depositProof.address,
      withdrawalProof.address,
      admin.address
    );

    const INVESTMENT = await depositProof.INVESTMENT();
    const WITHDRAWER = await treasury.WITHDRAWER();
    await depositProof.connect(admin).updateInvestment(investment.address);
    await withdrawalProof.connect(admin).updateInvestment(investment.address);
    await token.connect(admin).updateInvestment(investment.address);
    await treasury.connect(admin).grantRole(WITHDRAWER, investment.address);
    const MANAGER = await investment.MANAGER();
    await investment.connect(admin).grantRole(MANAGER, manager.address);
    await investment.connect(admin).updateEventBatchSize(eventBatchSize);

    const ORACLE = await management.ORACLE();
    await management.connect(admin).grantRole(ORACLE, manager.address);
    await management.connect(manager).updateIsCancelDeposit(isCancelDeposit);
    await management
      .connect(manager)
      .updateIsCancelWithdrawal(isCancelWithdrawal);

    await management
      .connect(manager)
      .updateDepositFee(depositFeeRate, minDepositFee, maxDepositFee);

    await management
      .connect(manager)
      .updatePerformanceFeeRate(performanceFeeRate);

    await management
      .connect(manager)
      .updateManagementFeeRate(managementFeeRate);

    await management.connect(manager).updateTokenPrice(tokenPrice);
    await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
    await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
    await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
    await management.connect(admin).updateSafeHouse(safeHouse.address);

    return {
      treasury,
      assetBook,
      safeHouse,
      stableToken,
      management,
      depositProof,
      withdrawalProof,
      holdTime,
      token,
      investment,
      accounts,
      owner,
      admin,
      manager,
    };
  }

  describe("Deployment", function () {
    it("Should set roles  ", async function () {
      const {
        treasury,
        investment,
        management,
        depositProof,
        withdrawalProof,
        token,
        owner,
        admin,
        manager,
      } = await deployeFixture();
      const ADMIN = await investment.DEFAULT_ADMIN_ROLE();
      const MANAGER = await investment.MANAGER();
      const ORACLE = await management.ORACLE();
      const INVESTMENT = await token.INVESTMENT();
      const WITHDRAWER = await treasury.WITHDRAWER();
      expect(await management.hasRole(ADMIN, admin.address)).to.equal(true);
      expect(await investment.hasRole(ADMIN, admin.address)).to.equal(true);
      expect(await depositProof.hasRole(ADMIN, admin.address)).to.equal(true);
      expect(await withdrawalProof.hasRole(ADMIN, admin.address)).to.equal(
        true
      );
      expect(await token.hasRole(ADMIN, admin.address)).to.equal(true);
      expect(await treasury.hasRole(ADMIN, admin.address)).to.equal(true);

      expect(
        await depositProof.hasRole(INVESTMENT, investment.address)
      ).to.equal(true);
      expect(
        await withdrawalProof.hasRole(INVESTMENT, investment.address)
      ).to.equal(true);
      expect(await token.hasRole(INVESTMENT, investment.address)).to.equal(
        true
      );
      expect(await treasury.hasRole(WITHDRAWER, investment.address)).to.equal(
        true
      );

      expect(await investment.hasRole(MANAGER, manager.address)).to.equal(true);
      expect(await management.hasRole(ORACLE, manager.address)).to.equal(true);
    });
  });

  describe("updateManagement", function () {
    it("Should emit the event UpdateManagement ", async function () {
      const { investment, treasury, owner, admin, manager } =
        await deployeFixture();
      const Management = await ethers.getContractFactory("Management");
      const management = await Management.deploy(
        admin.address,
        manager.address,
        treasury.address
      );

      await expect(
        investment.connect(admin).updateManagement(management.address)
      )
        .to.emit(investment, "UpdateManagement")
        .withArgs(management.address);
    });
  });

  describe("updateToken", function () {
    it("Should emit the event UpdateToken ", async function () {
      const { investment, holdTime, owner, admin, manager } =
        await deployeFixture();
      const Token = await ethers.getContractFactory("contracts/common/Token.sol:Token");
      const token = await Token.deploy(
        "ALPHA",
        "ALPHA",
        holdTime.address,
        admin.address
      );

      await expect(investment.connect(admin).updateToken(token.address))
        .to.emit(investment, "UpdateToken")
        .withArgs(token.address);
    });
  });

  describe("updateDepositProof", function () {
    it("Should emit the event UpdateDepositProof ", async function () {
      const { investment, owner, admin, manager } = await deployeFixture();
      const DepositProof = await ethers.getContractFactory("Proof");
      const depositProof = await DepositProof.deploy(
        "DALPHA",
        "DALPHA",
        1,
        admin.address
      );

      await expect(
        investment.connect(admin).updateDepositProof(depositProof.address)
      )
        .to.emit(investment, "UpdateDepositProof")
        .withArgs(depositProof.address);
    });
  });

  describe("updateWithdrawalProof", function () {
    it("Should emit the event UpdateWithdrawalProof ", async function () {
      const { investment, owner, admin, manager } = await deployeFixture();
      const WithdrawalProof = await ethers.getContractFactory("Proof");
      const withdrawalProof = await WithdrawalProof.deploy(
        "WALPHA",
        "WALPHA",
        0,
        admin.address
      );

      await expect(
        investment.connect(admin).updateWithdrawalProof(withdrawalProof.address)
      )
        .to.emit(investment, "UpdateWithdrawalProof")
        .withArgs(withdrawalProof.address);
    });
  });

  describe("updateAsset", function () {
    it("Should emit the event UpdateAsset ", async function () {
      const { investment, accounts, owner, admin, manager } =
        await deployeFixture();
    const decimals2 = 6;
    const StableToken2 = await ethers.getContractFactory("StableToken");
    const stableToken2 = await StableToken2.deploy(decimals2);
      await expect(investment.connect(admin).updateAsset(stableToken2.address))
        .to.emit(investment, "UpdateAsset")
        .withArgs(stableToken2.address);
      expect(await investment.asset()).to.equal(stableToken2.address);
    });
  });

  describe("updateEventBatchSize", function () {
    it("Should emit the event UpdateEventBatchSize ", async function () {
      const { investment, owner, admin, manager } = await deployeFixture();
      const eventBatchSize = 5;
      await expect(
        investment.connect(admin).updateEventBatchSize(eventBatchSize)
      )
        .to.emit(investment, "UpdateEventBatchSize")
        .withArgs(eventBatchSize);
      expect(await investment.eventBatchSize()).to.equal(eventBatchSize);
    });
  });

  describe("depositRequest", function () {
    it("it should update data and emit the event DepositRequest in the case of a first deposit", async function () {
      const {
        treasury,
        stableToken,
        investment,
        depositProof,
        accounts,
        owner,
        admin,
        manager,
      } = await deployeFixture();
      const investor = accounts[4];
      const to = accounts[5].address;
      const amount = 100_000_000_000_000;
      const tokenId = 0;
      const minPrice = 95_000_000;
      const maxPrice = 110_000_000;
      await stableToken.connect(owner).mint(investor.address, amount);
      await stableToken.connect(investor).approve(investment.address, amount);
      const fee = (await investment.getDepositFee(amount)).toNumber();
      await expect(
        investment
          .connect(investor)
          .depositRequest(to, tokenId, amount, minPrice, maxPrice, fee)
      )
        .to.emit(investment, "DepositRequest")
        .withArgs(to, amount - fee);

      expect(await stableToken.balanceOf(treasury.address)).to.equal(
        fee / 10 ** 12
      );

      expect(await stableToken.balanceOf(investment.address)).to.equal(
        (amount - fee) / 10 ** 12
      );

      expect(await depositProof.totalAmount()).to.equal(amount - fee);
      expect(await investment.depositProofTokenId()).to.equal(1);

      const pendingRequests = await depositProof.pendingRequests(1);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(amount - fee);
      expect(pendingRequests[2]).to.equal(minPrice);
      expect(pendingRequests[3]).to.equal(maxPrice);
      expect(pendingRequests[4]).to.equal(0);
    });

    it("it should update data and emit the event DepositRequest in the case of two deposit", async function () {
      const {
        treasury,
        stableToken,
        investment,
        depositProof,
        accounts,
        owner,
        admin,
        manager,
      } = await deployeFixture();
      const investor = accounts[4];
      const to = accounts[5].address;
      const amount1 = 100_000_000_000_000;
      const tokenId = 0;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;

      const amount2 = 200_000_000_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      await stableToken
        .connect(owner)
        .mint(investor.address, amount1 + amount2);
      await stableToken
        .connect(investor)
        .approve(investment.address, amount1 + amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor)
        .depositRequest(to, tokenId, amount1, minPrice1, maxPrice1, fee1);
      await expect(
        investment
          .connect(investor)
          .depositRequest(to, tokenId, amount2, minPrice2, maxPrice2, fee2)
      )
        .to.emit(investment, "DepositRequest")
        .withArgs(to, amount2 - fee2);

      expect(await stableToken.balanceOf(treasury.address)).to.equal(
        (fee1 + fee2) / 10 ** 12
      );

      expect(await stableToken.balanceOf(investment.address)).to.equal(
        (amount1 - fee1 + (amount2 - fee2)) / 10 ** 12
      );

      expect(await depositProof.totalAmount()).to.equal(
        amount1 - fee1 + amount2 - fee2
      );
      expect(await investment.depositProofTokenId()).to.equal(2);

      const pendingRequests1 = await depositProof.pendingRequests(1);
      const pendingRequests2 = await depositProof.pendingRequests(2);
      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(amount1 - fee1);
      expect(pendingRequests1[2]).to.equal(minPrice1);
      expect(pendingRequests1[3]).to.equal(maxPrice1);
      expect(pendingRequests1[4]).to.equal(0);

      expect(pendingRequests2[0]).to.equal(0);
      expect(pendingRequests2[1]).to.equal(amount2 - fee2);
      expect(pendingRequests2[2]).to.equal(minPrice2);
      expect(pendingRequests2[3]).to.equal(maxPrice2);
      expect(pendingRequests2[4]).to.equal(0);
    });

    it("it should update data and emit the event DepositRequest in the case of a deposit with an existed token", async function () {
      const {
        treasury,
        stableToken,
        investment,
        depositProof,
        accounts,
        owner,
        admin,
        manager,
      } = await deployeFixture();
      const investor = accounts[4];
      const to = accounts[5].address;
      const amount1 = 100_000_000_000_000;
      const tokenId = 0;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;

      const amount2 = 200_000_000_000_000;
      await stableToken
        .connect(owner)
        .mint(investor.address, amount1 + amount2);
      await stableToken
        .connect(investor)
        .approve(investment.address, amount1 + amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor)
        .depositRequest(to, tokenId, amount1, minPrice1, maxPrice1, fee1);
      const tokenId2 = await investment.depositProofTokenId();
      await expect(
        investment
          .connect(investor)
          .depositRequest(to, tokenId2, amount2, minPrice1, maxPrice1, fee2)
      )
        .to.emit(investment, "DepositRequest")
        .withArgs(to, amount2 - fee2);

      expect(await stableToken.balanceOf(treasury.address)).to.equal(
        (fee1 + fee2) / 10 ** 12
      );

      expect(await stableToken.balanceOf(investment.address)).to.equal(
        (amount1 - fee1 + (amount2 - fee2)) / 10 ** 12
      );

      expect(await depositProof.totalAmount()).to.equal(
        amount1 - fee1 + amount2 - fee2
      );
      expect(await investment.depositProofTokenId()).to.equal(1);

      const pendingRequests = await depositProof.pendingRequests(1);

      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(amount1 - fee1 + amount2 - fee2);
      expect(pendingRequests[2]).to.equal(minPrice1);
      expect(pendingRequests[3]).to.equal(maxPrice1);
      expect(pendingRequests[4]).to.equal(0);
    });
  });

  describe("cancelDepositRequest", function () {
    it(" it should update data and emit the event CancelDepositRequest when it is a full cancel", async function () {
      const {
        treasury,
        stableToken,
        investment,
        depositProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor = accounts[4];
      const to = investor.address;
      const amount1 = 100_000_000_000_000;
      const tokenId1 = 0;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      await stableToken.connect(owner).mint(investor.address, amount1);
      await stableToken.connect(investor).approve(investment.address, amount1);
      const fee = (await investment.getDepositFee(amount1)).toNumber();
      await investment
        .connect(investor)
        .depositRequest(to, tokenId1, amount1, minPrice1, maxPrice1, fee);
      const tokenId2 = await investment.depositProofTokenId();
      await expect(
        investment
          .connect(investor)
          .cancelDepositRequest(tokenId2, amount1 - fee)
      )
        .to.emit(investment, "CancelDepositRequest")
        .withArgs(to, amount1 - fee);
      expect(await stableToken.balanceOf(treasury.address)).to.equal(
        fee / 10 ** 12
      );
      expect(await stableToken.balanceOf(investment.address)).to.equal(0);
      expect(await stableToken.balanceOf(to)).to.equal(
        amount1 - amount1 / 10 ** 12 + (amount1 - fee) / 10 ** 12
      );
      expect(await depositProof.totalAmount()).to.equal(0);
      expect(await investment.depositProofTokenId()).to.equal(1);
      const pendingRequests = await depositProof.pendingRequests(tokenId2);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(0);
      expect(pendingRequests[2]).to.equal(0);
      expect(pendingRequests[3]).to.equal(0);
      expect(pendingRequests[4]).to.equal(0);
    });

    it(" it should update data and emit the event CancelDepositRequest when it is a partial cancel", async function () {
      const {
        treasury,
        stableToken,
        investment,
        depositProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor = accounts[4];
      const to = investor.address;
      const amount1 = 100_000_000_000_000;
      const tokenId1 = 0;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const amount2 = 50_000_000_000_000;
      await stableToken.connect(owner).mint(investor.address, amount1);
      await stableToken.connect(investor).approve(investment.address, amount1);
      const fee = (await investment.getDepositFee(amount1)).toNumber();
      await investment
        .connect(investor)
        .depositRequest(to, tokenId1, amount1, minPrice1, maxPrice1, fee);
      const tokenId2 = await investment.depositProofTokenId();
      await expect(
        investment.connect(investor).cancelDepositRequest(tokenId2, amount2)
      )
        .to.emit(investment, "CancelDepositRequest")
        .withArgs(to, amount2);
      expect(await stableToken.balanceOf(treasury.address)).to.equal(
        fee / 10 ** 12
      );
      expect(await stableToken.balanceOf(investment.address)).to.equal(
        (amount1 - fee - amount2) / 10 ** 12
      );
      expect(await stableToken.balanceOf(to)).to.equal(
        amount1 - (amount1 - amount2) / 10 ** 12
      );
      expect(await depositProof.totalAmount()).to.equal(
        amount1 - fee - amount2
      );
      expect(await investment.depositProofTokenId()).to.equal(1);
      const pendingRequests = await depositProof.pendingRequests(tokenId2);
      expect(pendingRequests[0]).to.equal(0);
      expect(pendingRequests[1]).to.equal(amount1 - fee - amount2);
      expect(pendingRequests[2]).to.equal(minPrice1);
      expect(pendingRequests[3]).to.equal(maxPrice1);
      expect(pendingRequests[4]).to.equal(0);
    });
  });

  describe("startNextEvent()", function () {
    it(" it should revert when the caller is not the manager", async function () {
      const {
        treasury,
        stableToken,
        management,
        investment,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const caller = accounts[4];
      await expect(investment.connect(caller).startNextEvent()).to.be
        .revertedWith;
    });

    it(" it should update data in the storage an emit the event StartNextEvent", async function () {
      const {
        treasury,
        stableToken,
        management,
        investment,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const caller = accounts[4];
      const tokenPrice1 = await management.tokenPrice();
      await expect(investment.connect(manager).startNextEvent()).to.emit(
        investment,
        "StartNextEvent"
      );
      await investment.connect(manager).startNextEvent();
      const tokenPrice2 = await investment.tokenPrice();
      const currentEventId2 = await investment.currentEventId();
      expect(tokenPrice2).to.equal(tokenPrice1[0]);
      expect(currentEventId2.toNumber()).to.equal(2);
    });
  });

  describe("validateDeposits", function () {
    it(" it should revert when the call is not the manager", async function () {
      const {
        treasury,
        stableToken,
        token,
        management,
        depositProof,
        investment,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const caller = accounts[4];
      const investor1 = accounts[5];
      const investor2 = accounts[6];
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 115_000_000;
      const tokenId = 0;
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const netAmountEvent = amount1 + amount2 - fee1 - fee2;
      const tokenIds = [tokenId1, tokenId2];
      await investment.connect(manager).startNextEvent();
      await expect(
        investment.connect(caller).validateDeposits(tokenIds, netAmountEvent)
      ).to.be.revertedWith;
    });

    it("it should fully validate the deposit requests in the case of one request", async function () {
      const {
        treasury,
        stableToken,
        token,
        depositProof,
        management,
        investment,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const caller = accounts[4];
      const investor1 = accounts[5];
      const investor2 = accounts[6];
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 115_000_000;
      const tokenId = 0;
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );

      await investment.connect(manager).startNextEvent();
      const netAmountEvent = amount1 - fee1;
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );

      const tokenIds = [tokenId1];
      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);

      const tokenPrice = (await investment.tokenPrice()).toNumber();
      const expectedTokenPriceMean = tokenPrice;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      const totalTokenAmount = Math.floor(
        (netAmountEvent * scalingFactor) / tokenPrice
      );

      const tokenAmount1 = Math.floor(
        ((amount1 - fee1) * scalingFactor) / tokenPrice
      );

      const validationTime = await time.latest();
      const tokenPriceMean = (await investment.tokenPriceMean()).toNumber;
      const pendingRequests1 = await depositProof.pendingRequests(tokenId1);
      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(0);
      expect(pendingRequests1[2]).to.equal(0);
      expect(pendingRequests1[3]).to.equal(0);
      expect(pendingRequests1[4]).to.equal(0);

      expect(await token.totalSupply()).to.equal(totalTokenAmount);
      expect(await depositProof.totalAmount()).to.equal(0);
      expect(await token.balanceOf(investor1.address)).to.equal(tokenAmount1);
      expect(await depositProof.balanceOf(investor1.address)).to.equal(0);
      expect(await investment.managementFeeLastTime()).to.equal(validationTime);
      expect(await investment.tokenPriceMean()).to.equal(
        expectedTokenPriceMean
      );
    });

    it("it should fully validate the deposit requests in the case of two requests", async function () {
      const {
        treasury,
        stableToken,
        token,
        depositProof,
        management,
        investment,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const caller = accounts[4];
      const investor1 = accounts[5];
      const investor2 = accounts[6];
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 115_000_000;
      const tokenId = 0;
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      await investment.connect(manager).startNextEvent();
      const netAmountEvent = amount1 + amount2 - fee1 - fee2;
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];
      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);

      const tokenPrice = (await investment.tokenPrice()).toNumber();
      const expectedTokenPriceMean = tokenPrice;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      const totalTokenAmount = Math.floor(
        (netAmountEvent * scalingFactor) / tokenPrice
      );

      const tokenAmount1 = Math.floor(
        ((amount1 - fee1) * scalingFactor) / tokenPrice
      );

      const tokenAmount2 = Math.floor(
        ((amount2 - fee2) * scalingFactor) / tokenPrice
      );
      const validationTime = await time.latest();
      const tokenPriceMean = (await investment.tokenPriceMean()).toNumber;
      const pendingRequests1 = await depositProof.pendingRequests(tokenId1);
      const pendingRequests2 = await depositProof.pendingRequests(tokenId2);
      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(0);
      expect(pendingRequests1[2]).to.equal(0);
      expect(pendingRequests1[3]).to.equal(0);
      expect(pendingRequests1[4]).to.equal(0);

      expect(pendingRequests2[0]).to.equal(0);
      expect(pendingRequests2[1]).to.equal(0);
      expect(pendingRequests1[2]).to.equal(0);
      expect(pendingRequests2[3]).to.equal(0);
      expect(pendingRequests2[4]).to.equal(0);

      expect(await token.totalSupply()).to.equal(totalTokenAmount);
      expect(await depositProof.totalAmount()).to.equal(0);
      expect(await token.balanceOf(investor1.address)).to.equal(tokenAmount1);
      expect(await token.balanceOf(investor2.address)).to.equal(tokenAmount2);
      expect(await depositProof.balanceOf(investor1.address)).to.equal(0);
      expect(await depositProof.balanceOf(investor2.address)).to.equal(0);
      expect(await token.balanceOf(investor2.address)).to.equal(tokenAmount2);
      expect(await investment.managementFeeLastTime()).to.equal(validationTime);
      expect(await investment.tokenPriceMean()).to.equal(
        expectedTokenPriceMean
      );
    });

    it("it should partially validate the deposit requests in the case of one request", async function () {
      const {
        treasury,
        stableToken,
        token,
        depositProof,
        management,
        investment,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const caller = accounts[4];
      const investor1 = accounts[5];
      const investor2 = accounts[6];
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 115_000_000;
      const tokenId = 0;
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const amount3 = 70_000_000_000_000;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );

      await investment.connect(manager).startNextEvent();
      const netAmountEvent = amount1 - fee1 - amount3;
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );

      const tokenIds = [tokenId1];
      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);

      const tokenPrice = (await investment.tokenPrice()).toNumber();
      const expectedTokenPriceMean = tokenPrice;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      const totalTokenAmount = Math.floor(
        (netAmountEvent * scalingFactor) / tokenPrice
      );

      const tokenAmount1 = Math.floor(
        ((amount1 - fee1 - amount3) * scalingFactor) / tokenPrice
      );

      const validationTime = await time.latest();
      const tokenPriceMean = (await investment.tokenPriceMean()).toNumber;
      const pendingRequests1 = await depositProof.pendingRequests(tokenId1);
      const currentEventId = await investment.currentEventId();

      expect(pendingRequests1[0]).to.equal(amount3);
      expect(pendingRequests1[1]).to.equal(0);
      expect(pendingRequests1[2]).to.equal(minPrice1);
      expect(pendingRequests1[3]).to.equal(maxPrice1);
      expect(pendingRequests1[4]).to.equal(currentEventId);
      expect(currentEventId).to.equal(1);
      expect(await token.totalSupply()).to.equal(totalTokenAmount);
      expect(await depositProof.totalAmount()).to.equal(amount3);
      expect(await token.balanceOf(investor1.address)).to.equal(tokenAmount1);
      expect(await depositProof.balanceOf(investor1.address)).to.equal(1);
      expect(await investment.managementFeeLastTime()).to.equal(validationTime);
      expect(await investment.tokenPriceMean()).to.equal(
        expectedTokenPriceMean
      );
    });

    it("it should partially validate the deposit requests in the case of two requests", async function () {
      const {
        treasury,
        stableToken,
        token,
        depositProof,
        management,
        investment,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const caller = accounts[4];
      const investor1 = accounts[5];
      const investor2 = accounts[6];
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 115_000_000;
      const tokenId = 0;
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const amount3 = 70_000_000_000_000;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      await investment.connect(manager).startNextEvent();
      const netAmountEvent = amount1 - fee1 + amount2 - fee2 - amount3;
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];
      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);

      const tokenPrice = (await investment.tokenPrice()).toNumber();
      const expectedTokenPriceMean = tokenPrice;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      const totalTokenAmount = Math.floor(
        (netAmountEvent * scalingFactor) / tokenPrice
      );

      const tokenAmount1 = Math.floor(
        ((amount1 - fee1) * scalingFactor) / tokenPrice
      );

      const tokenAmount2 = Math.floor(
        ((amount2 - fee2 - amount3) * scalingFactor) / tokenPrice
      );
      const validationTime = await time.latest();
      const tokenPriceMean = (await investment.tokenPriceMean()).toNumber;
      const pendingRequests1 = await depositProof.pendingRequests(tokenId1);
      const pendingRequests2 = await depositProof.pendingRequests(tokenId2);
      const currentEventId = await investment.currentEventId();
      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(0);
      expect(pendingRequests1[2]).to.equal(0);
      expect(pendingRequests1[3]).to.equal(0);
      expect(pendingRequests1[4]).to.equal(0);

      expect(pendingRequests2[0]).to.equal(amount3);
      expect(pendingRequests2[1]).to.equal(0);
      expect(pendingRequests2[2]).to.equal(minPrice2);
      expect(pendingRequests2[3]).to.equal(maxPrice2);
      expect(pendingRequests2[4]).to.equal(currentEventId);
      expect(currentEventId).to.equal(1);
      expect(await token.totalSupply()).to.equal(totalTokenAmount);
      expect(await depositProof.totalAmount()).to.equal(amount3);
      expect(await token.balanceOf(investor1.address)).to.equal(tokenAmount1);
      expect(await token.balanceOf(investor2.address)).to.equal(tokenAmount2);
      expect(await depositProof.balanceOf(investor1.address)).to.equal(0);
      expect(await depositProof.balanceOf(investor2.address)).to.equal(1);
      expect(await investment.managementFeeLastTime()).to.equal(validationTime);
      expect(await investment.tokenPriceMean()).to.equal(
        expectedTokenPriceMean
      );
    });

    it("it should not validate a deposit requests if the token price is not in its range, in the case of one request", async function () {
      const {
        treasury,
        stableToken,
        token,
        depositProof,
        management,
        investment,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const caller = accounts[4];
      const investor1 = accounts[5];
      const investor2 = accounts[6];
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 120_000_000;
      const maxPrice2 = 130_000_000;
      const tokenId = 0;
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      await investment.connect(manager).startNextEvent();
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId2];
      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);

      const tokenPrice = (await investment.tokenPrice()).toNumber();
      const expectedTokenPriceMean = 0;
      const totalTokenAmount = 0;

      const tokenAmount1 = 0;

      const validationTime = await time.latest();
      const tokenPriceMean = (await investment.tokenPriceMean()).toNumber;
      const pendingRequests1 = await depositProof.pendingRequests(tokenId1);
      const pendingRequests2 = await depositProof.pendingRequests(tokenId2);
      const currentEventId = await investment.currentEventId();
      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(amount1 - fee1);
      expect(pendingRequests1[2]).to.equal(minPrice1);
      expect(pendingRequests1[3]).to.equal(maxPrice1);
      expect(pendingRequests1[4]).to.equal(0);

      expect(pendingRequests2[0]).to.equal(0);
      expect(pendingRequests2[1]).to.equal(amount2 - fee2);
      expect(pendingRequests2[2]).to.equal(minPrice2);
      expect(pendingRequests2[3]).to.equal(maxPrice2);
      expect(pendingRequests2[4]).to.equal(currentEventId);
      expect(currentEventId).to.equal(1);
      expect(await token.totalSupply()).to.equal(totalTokenAmount);
      expect(await depositProof.totalAmount()).to.equal(
        amount1 - fee1 + amount2 - fee2
      );
      expect(await token.balanceOf(investor1.address)).to.equal(tokenAmount1);
      expect(await token.balanceOf(investor2.address)).to.equal(0);
      expect(await depositProof.balanceOf(investor1.address)).to.equal(1);
      expect(await depositProof.balanceOf(investor2.address)).to.equal(1);
      expect(await investment.managementFeeLastTime()).to.equal(validationTime);
      expect(await investment.tokenPriceMean()).to.equal(
        expectedTokenPriceMean
      );
      await expect(
        investment
          .connect(investor1)
          .cancelDepositRequest(tokenId1, amount1 - fee1)
      ).to.be.revertedWith;

      await investment
        .connect(investor2)
        .cancelDepositRequest(tokenId2, amount2 - fee2);
      const pendingRequests3 = await depositProof.pendingRequests(tokenId2);
      expect(pendingRequests3[0]).to.equal(0);
      expect(pendingRequests3[1]).to.equal(0);
      expect(pendingRequests3[2]).to.equal(0);
      expect(pendingRequests3[3]).to.equal(0);
      expect(pendingRequests3[4]).to.equal(0);
    });

    it("it should not validate a deposit requests if the token price is not in its range, in the case of two requests", async function () {
      const {
        treasury,
        stableToken,
        token,
        depositProof,
        management,
        investment,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const caller = accounts[4];
      const investor1 = accounts[5];
      const investor2 = accounts[6];
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 120_000_000;
      const maxPrice2 = 130_000_000;
      const tokenId = 0;
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      await investment.connect(manager).startNextEvent();
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];
      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);

      const tokenPrice = (await investment.tokenPrice()).toNumber();
      const expectedTokenPriceMean = tokenPrice;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      const totalTokenAmount = Math.floor(
        ((amount1 - fee1) * scalingFactor) / tokenPrice
      );

      const tokenAmount1 = Math.floor(
        ((amount1 - fee1) * scalingFactor) / tokenPrice
      );

      const validationTime = await time.latest();
      const tokenPriceMean = (await investment.tokenPriceMean()).toNumber;
      const pendingRequests1 = await depositProof.pendingRequests(tokenId1);
      const pendingRequests2 = await depositProof.pendingRequests(tokenId2);
      const currentEventId = await investment.currentEventId();
      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(0);
      expect(pendingRequests1[2]).to.equal(0);
      expect(pendingRequests1[3]).to.equal(0);
      expect(pendingRequests1[4]).to.equal(0);

      expect(pendingRequests2[0]).to.equal(0);
      expect(pendingRequests2[1]).to.equal(amount2 - fee2);
      expect(pendingRequests2[2]).to.equal(minPrice2);
      expect(pendingRequests2[3]).to.equal(maxPrice2);
      expect(pendingRequests2[4]).to.equal(currentEventId);
      expect(currentEventId).to.equal(1);
      expect(await token.totalSupply()).to.equal(totalTokenAmount);
      expect(await depositProof.totalAmount()).to.equal(amount2 - fee2);
      expect(await token.balanceOf(investor1.address)).to.equal(tokenAmount1);
      expect(await token.balanceOf(investor2.address)).to.equal(0);
      expect(await depositProof.balanceOf(investor1.address)).to.equal(0);
      expect(await depositProof.balanceOf(investor2.address)).to.equal(1);
      expect(await investment.managementFeeLastTime()).to.equal(validationTime);
      expect(await investment.tokenPriceMean()).to.equal(
        expectedTokenPriceMean
      );

      await investment
        .connect(investor2)
        .cancelDepositRequest(tokenId2, amount2 - fee2);
      const pendingRequests3 = await depositProof.pendingRequests(tokenId2);
      expect(pendingRequests3[0]).to.equal(0);
      expect(pendingRequests3[1]).to.equal(0);
      expect(pendingRequests3[2]).to.equal(0);
      expect(pendingRequests3[3]).to.equal(0);
      expect(pendingRequests3[4]).to.equal(0);
    });

    it("it should validate the deposit requests one by one", async function () {
      const {
        treasury,
        stableToken,
        token,
        depositProof,
        management,
        investment,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const caller = accounts[4];
      const investor1 = accounts[5];
      const investor2 = accounts[6];
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      await investment.connect(manager).startNextEvent();
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );

      await investment
        .connect(manager)
        .validateDeposits([tokenId1], netAmountEvent);
      const validationTime = await time.latest();
      await investment
        .connect(manager)
        .validateDeposits([tokenId2], netAmountEvent);

      const tokenPrice = (await investment.tokenPrice()).toNumber();
      const expectedTokenPriceMean = tokenPrice;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      const totalTokenAmount = Math.floor(
        ((amount1 - fee1 + amount2 - fee2) * scalingFactor) / tokenPrice
      );

      const tokenAmount1 = Math.floor(
        ((amount1 - fee1) * scalingFactor) / tokenPrice
      );

      const tokenAmount2 = Math.floor(
        ((amount2 - fee2) * scalingFactor) / tokenPrice
      );

      const tokenPriceMean = (await investment.tokenPriceMean()).toNumber;
      const pendingRequests1 = await depositProof.pendingRequests(tokenId1);
      const pendingRequests2 = await depositProof.pendingRequests(tokenId2);
      const currentEventId = await investment.currentEventId();
      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(0);
      expect(pendingRequests1[2]).to.equal(0);
      expect(pendingRequests1[3]).to.equal(0);
      expect(pendingRequests1[4]).to.equal(0);

      expect(pendingRequests2[0]).to.equal(0);
      expect(pendingRequests2[1]).to.equal(0);
      expect(pendingRequests2[2]).to.equal(0);
      expect(pendingRequests2[3]).to.equal(0);
      expect(pendingRequests2[4]).to.equal(0);
      expect(currentEventId).to.equal(1);
      expect(await token.totalSupply()).to.equal(totalTokenAmount);
      expect(await depositProof.totalAmount()).to.equal(0);
      expect(await token.balanceOf(investor1.address)).to.equal(tokenAmount1);
      expect(await token.balanceOf(investor2.address)).to.equal(tokenAmount2);
      expect(await depositProof.balanceOf(investor1.address)).to.equal(0);
      expect(await depositProof.balanceOf(investor2.address)).to.equal(0);
      expect(await investment.managementFeeLastTime()).to.equal(validationTime);
      expect(await investment.tokenPriceMean()).to.equal(
        expectedTokenPriceMean
      );
    });

    it("it should update tokenPriceMean", async function () {
      const {
        treasury,
        stableToken,
        token,
        depositProof,
        management,
        investment,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const caller = accounts[4];
      const investor1 = accounts[5];
      const investor2 = accounts[6];
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 190_000_000;
      const maxPrice2 = 220_000_000;
      const tokenId = 0;
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      await investment.connect(manager).startNextEvent();
      const tokenPrice1 = (await investment.tokenPrice()).toNumber();
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      await investment
        .connect(manager)
        .validateDeposits([tokenId1], netAmountEvent);
      const validationTime1 = await time.latest();
      const tokenPrice2 = 200000000;
      await management.connect(manager).updateTokenPrice(tokenPrice2);
      await investment.connect(manager).startNextEvent();
      await investment
        .connect(manager)
        .validateDeposits([tokenId2], netAmountEvent);

      const validationTime2 = await time.latest();

      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();

      const tokenAmount1 = Math.floor(
        ((amount1 - fee1) * scalingFactor) / tokenPrice1
      );

      const tokenAmount2 = Math.floor(
        ((amount2 - fee2) * scalingFactor) / tokenPrice2
      );

      const totalTokenAmount = tokenAmount1 + tokenAmount2;
      const expectedTokenPriceMean = Math.floor(
        (tokenAmount1 * tokenPrice1 + tokenAmount2 * tokenPrice2) /
          (tokenAmount1 + tokenAmount2)
      );
      const tokenPriceMean = (await investment.tokenPriceMean()).toNumber;
      const pendingRequests1 = await depositProof.pendingRequests(tokenId1);
      const pendingRequests2 = await depositProof.pendingRequests(tokenId2);
      const currentEventId = await investment.currentEventId();
      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(0);
      expect(pendingRequests1[2]).to.equal(0);
      expect(pendingRequests1[3]).to.equal(0);
      expect(pendingRequests1[4]).to.equal(0);

      expect(pendingRequests2[0]).to.equal(0);
      expect(pendingRequests2[1]).to.equal(0);
      expect(pendingRequests2[2]).to.equal(0);
      expect(pendingRequests2[3]).to.equal(0);
      expect(pendingRequests2[4]).to.equal(0);
      expect(currentEventId).to.equal(2);
      expect(await token.totalSupply()).to.equal(totalTokenAmount);
      expect(await depositProof.totalAmount()).to.equal(0);
      expect(await token.balanceOf(investor1.address)).to.equal(tokenAmount1);
      expect(await token.balanceOf(investor2.address)).to.equal(tokenAmount2);
      expect(await depositProof.balanceOf(investor1.address)).to.equal(0);
      expect(await depositProof.balanceOf(investor2.address)).to.equal(0);
      expect(await investment.managementFeeLastTime()).to.equal(
        validationTime1
      );
      expect(await investment.tokenPriceMean()).to.equal(
        expectedTokenPriceMean
      );
    });
  });

  describe("mintPerformanceFee", function () {
    it(" it should send performance fee to the treasury and emit the event MintPerformanceFee", async function () {
      const {
        treasury,
        stableToken,
        token,
        management,
        investment,
        depositProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();

      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      const tokenPriceMean = (await investment.tokenPriceMean()).toNumber();

      const validationTime = await time.latest();
      const tokenPrice2 = 200000000;
      await management.connect(manager).updateTokenPrice(tokenPrice2);
      const totalSupply = (await token.totalSupply()).toNumber();
      const performanceFeeRate = (
        await management.performanceFeeRate()
      ).toNumber();
      const performanceFee = Math.floor(
        ((tokenPrice2 - tokenPriceMean) * totalSupply * performanceFeeRate) /
          (tokenPrice2 * scalingFactor)
      );
      const treasuryBalanceBefore = await token.balanceOf(treasury.address);
      const treasuryBalanceAfter =
        treasuryBalanceBefore.toNumber() + performanceFee;
      await expect(investment.connect(manager).mintPerformanceFee())
        .to.emit(investment, "MintPerformanceFee")
        .withArgs(performanceFee);

      expect(await token.balanceOf(treasury.address)).to.equal(
        treasuryBalanceAfter
      );
    });
    it("it should not mint performance fee when tokenPrice is lower than tokenPriceMean", async function () {
      const {
        treasury,
        stableToken,
        token,
        management,
        investment,
        depositProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();

      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      const tokenPriceMean = (await investment.tokenPriceMean()).toNumber();

      const validationTime = await time.latest();
      const tokenPrice2 = 200000000;
      await management.connect(manager).updateTokenPrice(tokenPrice2);
      const totalSupply = (await token.totalSupply()).toNumber();
      const performanceFeeRate = (
        await management.performanceFeeRate()
      ).toNumber();
      const performanceFee = 0;
      const tokenPrice3 = 50000000;
      await management.connect(manager).updateTokenPrice(tokenPrice3);
      await expect(investment.connect(manager).mintPerformanceFee())
        .to.emit(investment, "MintPerformanceFee")
        .withArgs(performanceFee);

      expect(await token.balanceOf(treasury.address)).to.equal(0);
    });
  });
  describe("mintManagementFee", function () {
    it(" it should send management fee to the treasury and emit the event MintManagementFee", async function () {
      const {
        treasury,
        stableToken,
        token,
        management,
        investment,
        depositProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      const Time1 = await time.latest();
      const totalSupply = (await token.totalSupply()).toNumber();
      const SECONDES_PER_YEAR = 365 * 24 * 60 * 60;
      const managementFeeRate = (
        await management.managementFeeRate()
      ).toNumber();
      const treasuryBalanceBefore = await token.balanceOf(treasury.address);
      await time.increaseTo(Time1 + 3600);

      await expect(investment.connect(manager).mintManagementFee()).to.emit(
        investment,
        "MintManagementFee"
      ).withArgs;
      const Time2 = await time.latest();
      const managementFee = Math.floor(
        ((Time2 - Time1) * totalSupply * managementFeeRate) /
          (SECONDES_PER_YEAR * scalingFactor)
      );

      const treasuryBalanceAfter =
        treasuryBalanceBefore.toNumber() + managementFee;
      // expect(await token.balanceOf(treasury.address)).to.equal(
      // treasuryBalanceAfter
      //);
    });
  });

  describe("withdrawalRequest", function () {
    it(" it should revert when amount is zero", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await expect(
        investment
          .connect(investor1)
          .withdrawalRequest(tokenId, 0, minPrice3, maxPrice3, withdrawalFee1)
      ).to.be.revertedWith("Transformative Fi: zero amount");
    });

    it("it should revert when amount exceeds balance", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await expect(
        investment
          .connect(investor1)
          .withdrawalRequest(
            tokenId,
            amount1,
            minPrice3,
            maxPrice3,
            withdrawalFee1
          )
      ).to.be.revertedWith("Transformative Fi: amount exceeds balance");
    });

    it("it should revert when caller is not the owner", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;
      await investment
        .connect(investor1)
        .withdrawalRequest(
          tokenId,
          Math.floor(amount3 / 2),
          minPrice3,
          maxPrice3,
          withdrawalFee1
        );
      const tokenId3 = await withdrawalProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      await expect(
        investment
          .connect(investor2)
          .withdrawalRequest(
            tokenId3,
            Math.floor(amount3 / 2),
            minPrice3,
            maxPrice3,
            withdrawalFee1
          )
      ).to.be.revertedWith("Every.finance: caller is not owner");
    });

    it("it should revert when minPrice is higher than maxPrice", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await expect(
        investment
          .connect(investor1)
          .withdrawalRequest(
            tokenId,
            amount3,
            maxPrice3,
            minPrice3,
            withdrawalFee1
          )
      ).to.be.revertedWith("Every.finance: wrong prices");
    });

    it("it should revert when maxPrice is zero", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await expect(
        investment
          .connect(investor1)
          .withdrawalRequest(tokenId, amount3, 0, 0, withdrawalFee1)
      ).to.be.revertedWith("Every.finance: wrong prices");
    });

    it("it should revert when withdrawal fee is higher than maxFee", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await expect(
        investment
          .connect(investor1)
          .withdrawalRequest(
            tokenId,
            amount3,
            minPrice3,
            maxPrice3,
            Math.floor(withdrawalFee1 / 2)
          )
      ).to.be.revertedWith("Every.finance: max allowed fee");
    });

    it("it should revert when the price are changed at a different event Id", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;
      await investment
        .connect(investor1)
        .withdrawalRequest(
          tokenId,
          Math.floor(amount3 / 2),
          minPrice3,
          maxPrice3,
          withdrawalFee1
        );
      const tokenId3 = await withdrawalProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      await investment.connect(manager).startNextEvent();
      await expect(
        investment
          .connect(investor1)
          .withdrawalRequest(
            tokenId3,
            Math.floor(amount3 / 2),
            Math.floor(minPrice3 / 2),
            Math.floor(maxPrice3 / 2),
            withdrawalFee1
          )
      ).to.be.revertedWith("Every.finance: price don't match");
    });

    it(" it should update data and emit the event WithdrawalRequest in the case of one withdrawal request by investor", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await investment
        .connect(investor1)
        .withdrawalRequest(
          tokenId,
          amount3,
          minPrice3,
          maxPrice3,
          withdrawalFee1
        );

      await expect(
        investment
          .connect(investor2)
          .withdrawalRequest(
            tokenId,
            amount4,
            minPrice4,
            maxPrice4,
            withdrawalFee2
          )
      )
        .to.emit(investment, "WithdrawalRequest")
        .withArgs(investor2.address, amount4 - withdrawalFee2);

      const tokenId3 = await withdrawalProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId4 = await withdrawalProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const pendingRequests1 = await withdrawalProof.pendingRequests(tokenId3);
      const pendingRequests2 = await withdrawalProof.pendingRequests(tokenId4);

      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(amount3 - withdrawalFee1);
      expect(pendingRequests1[2]).to.equal(minPrice3);
      expect(pendingRequests1[3]).to.equal(maxPrice3);
      expect(pendingRequests1[4]).to.equal(1);

      expect(pendingRequests2[0]).to.equal(0);
      expect(pendingRequests2[1]).to.equal(amount4 - withdrawalFee2);
      expect(pendingRequests2[2]).to.equal(minPrice4);
      expect(pendingRequests2[3]).to.equal(maxPrice4);
      expect(pendingRequests2[4]).to.equal(1);

      expect(await token.balanceOf(investment.address)).to.equal(
        amount3 - withdrawalFee1 + amount4 - withdrawalFee2
      );

      expect(await token.balanceOf(treasury.address)).to.equal(
        withdrawalFee1 + withdrawalFee2
      );

      expect(await token.balanceOf(investor1.address)).to.equal(
        amount1 - fee1 - amount3
      );

      expect(await token.balanceOf(investor2.address)).to.equal(
        amount2 - fee2 - amount4
      );
    });

    it(" it should update data and emit the event WithdrawalRequest in the case of two withdrawal requests", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await investment
        .connect(investor1)
        .withdrawalRequest(
          tokenId,
          amount3,
          minPrice3,
          maxPrice3,
          withdrawalFee1
        );

      await expect(
        investment
          .connect(investor2)
          .withdrawalRequest(
            tokenId,
            Math.floor(amount4 / 2),
            minPrice4,
            maxPrice4,
            Math.floor(withdrawalFee2 / 2)
          )
      )
        .to.emit(investment, "WithdrawalRequest")
        .withArgs(
          investor2.address,
          Math.floor(amount4 / 2) - Math.floor(withdrawalFee2 / 2)
        );

      const tokenId3 = await withdrawalProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId4 = await withdrawalProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      investment
        .connect(investor2)
        .withdrawalRequest(
          tokenId4,
          Math.floor(amount4 / 2),
          Math.floor(minPrice4 / 2),
          Math.floor(maxPrice4 / 2),
          Math.floor(withdrawalFee2 / 2)
        );
      const pendingRequests1 = await withdrawalProof.pendingRequests(tokenId3);
      const pendingRequests2 = await withdrawalProof.pendingRequests(tokenId4);

      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(amount3 - withdrawalFee1);
      expect(pendingRequests1[2]).to.equal(minPrice3);
      expect(pendingRequests1[3]).to.equal(maxPrice3);
      expect(pendingRequests1[4]).to.equal(1);

      expect(pendingRequests2[0]).to.equal(0);
      expect(pendingRequests2[1]).to.equal(amount4 - withdrawalFee2);
      expect(pendingRequests2[2]).to.equal(Math.floor(minPrice4 / 2));
      expect(pendingRequests2[3]).to.equal(Math.floor(maxPrice4 / 2));
      expect(pendingRequests2[4]).to.equal(1);

      expect(await token.balanceOf(investment.address)).to.equal(
        amount3 - withdrawalFee1 + amount4 - withdrawalFee2
      );

      expect(await token.balanceOf(treasury.address)).to.equal(
        withdrawalFee1 + withdrawalFee2
      );

      expect(await token.balanceOf(investor1.address)).to.equal(
        amount1 - fee1 - amount3
      );

      expect(await token.balanceOf(investor2.address)).to.equal(
        amount2 - fee2 - amount4
      );
    });
  });

  describe("cancelwithdrawalRequest", function () {
    it(" it should update data and emit the event CancelWithdrawalRequest in the case of a full cancel", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await investment
        .connect(investor1)
        .withdrawalRequest(
          tokenId,
          amount3,
          minPrice3,
          maxPrice3,
          withdrawalFee1
        );

      const tokenId3 = await withdrawalProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );

      await expect(
        investment
          .connect(investor1)
          .cancelWithdrawalRequest(tokenId3, amount3 - withdrawalFee1)
      )
        .to.emit(investment, "CancelWithdrawalRequest")
        .withArgs(investor1.address, amount3 - withdrawalFee1);

      const pendingRequests1 = await withdrawalProof.pendingRequests(tokenId3);

      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(0);
      expect(pendingRequests1[2]).to.equal(0);
      expect(pendingRequests1[3]).to.equal(0);
      expect(pendingRequests1[4]).to.equal(0);

      expect(await token.balanceOf(investment.address)).to.equal(0);

      expect(await token.balanceOf(treasury.address)).to.equal(withdrawalFee1);

      expect(await token.balanceOf(investor1.address)).to.equal(
        amount1 - fee1 - withdrawalFee1
      );
    });

    it(" it should update data and emit the event CancelWithdrawalRequest in the case of a partial cancel", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await investment
        .connect(investor1)
        .withdrawalRequest(
          tokenId,
          amount3,
          minPrice3,
          maxPrice3,
          withdrawalFee1
        );

      const tokenId3 = await withdrawalProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );

      await expect(
        investment
          .connect(investor1)
          .cancelWithdrawalRequest(tokenId3, Math.floor(amount3 / 2))
      )
        .to.emit(investment, "CancelWithdrawalRequest")
        .withArgs(investor1.address, Math.floor(amount3 / 2));

      const pendingRequests1 = await withdrawalProof.pendingRequests(tokenId3);

      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(
        amount3 - withdrawalFee1 - Math.floor(amount3 / 2)
      );
      expect(pendingRequests1[2]).to.equal(minPrice3);
      expect(pendingRequests1[3]).to.equal(maxPrice3);
      expect(pendingRequests1[4]).to.equal(1);

      expect(await token.balanceOf(investment.address)).to.equal(
        amount3 - withdrawalFee1 - Math.floor(amount3 / 2)
      );

      expect(await token.balanceOf(treasury.address)).to.equal(withdrawalFee1);

      expect(await token.balanceOf(investor1.address)).to.equal(
        amount1 - fee1 - amount3 + Math.floor(amount3 / 2)
      );
    });

    it(" it should update data and emit the event CancelWithdrawalRequest in the case of two cancel requests by investor", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await investment
        .connect(investor1)
        .withdrawalRequest(
          tokenId,
          amount3,
          minPrice3,
          maxPrice3,
          withdrawalFee1
        );

      const tokenId3 = await withdrawalProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );

      await expect(
        investment
          .connect(investor1)
          .cancelWithdrawalRequest(tokenId3, Math.floor(amount3 / 2))
      )
        .to.emit(investment, "CancelWithdrawalRequest")
        .withArgs(investor1.address, Math.floor(amount3 / 2));

      const pendingRequests1 = await withdrawalProof.pendingRequests(tokenId3);

      await investment
        .connect(investor1)
        .cancelWithdrawalRequest(tokenId3, pendingRequests1[1]);

      const pendingRequests2 = await withdrawalProof.pendingRequests(tokenId3);

      expect(pendingRequests2[0]).to.equal(0);
      expect(pendingRequests2[1]).to.equal(0);
      expect(pendingRequests2[2]).to.equal(0);
      expect(pendingRequests2[3]).to.equal(0);
      expect(pendingRequests2[4]).to.equal(0);

      expect(await token.balanceOf(investment.address)).to.equal(0);

      expect(await token.balanceOf(treasury.address)).to.equal(withdrawalFee1);

      expect(await token.balanceOf(investor1.address)).to.equal(
        amount1 - fee1 - withdrawalFee1
      );
    });

    it(" it should revert when the investor cancels at a different event Id", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await investment
        .connect(investor1)
        .withdrawalRequest(
          tokenId,
          amount3,
          minPrice3,
          maxPrice3,
          withdrawalFee1
        );

      const tokenId3 = await withdrawalProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      await investment.connect(manager).startNextEvent();

      await expect(
        investment
          .connect(investor1)
          .cancelWithdrawalRequest(tokenId3, Math.floor(amount3 / 2))
      ).to.be.revertedWith("Every.finance: max amount");
    });
  });

  describe("validateWithdrawals", function () {
    it(" it should validate withdrawal requests in the case of the price range of each request is valid ", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 94_000_000;
      const maxPrice4 = 111_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await investment
        .connect(investor1)
        .withdrawalRequest(
          tokenId,
          amount3,
          minPrice3,
          maxPrice3,
          withdrawalFee1
        );

      await investment
        .connect(investor2)
        .withdrawalRequest(
          tokenId,
          amount4,
          minPrice4,
          maxPrice4,
          withdrawalFee2
        );

      const tokenId3 = await withdrawalProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId4 = await withdrawalProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );

      await investment.connect(manager).startNextEvent();
      const tokenIds2 = [tokenId3, tokenId4];
      const netAmountEvent2 =
        amount3 + amount4 - withdrawalFee1 - withdrawalFee2;

      const balanceBefore1 = await stableToken.balanceOf(investor1.address);
      const balanceBefore2 = await stableToken.balanceOf(investor2.address);

      await investment
        .connect(manager)
        .validateWithdrawals(tokenIds2, netAmountEvent2);

      const tokenPrice = (await investment.tokenPrice()).toNumber();
      const assetAmount1 = Math.floor(
        ((amount3 - withdrawalFee1) * tokenPrice) / scalingFactor
      );
      const assetAmount2 = Math.floor(
        ((amount4 - withdrawalFee2) * tokenPrice) / scalingFactor
      );

      const pendingRequests1 = await withdrawalProof.pendingRequests(tokenId3);
      const pendingRequests2 = await withdrawalProof.pendingRequests(tokenId4);

      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(0);
      expect(pendingRequests1[2]).to.equal(0);
      expect(pendingRequests1[3]).to.equal(0);
      expect(pendingRequests1[4]).to.equal(0);

      expect(pendingRequests2[0]).to.equal(0);
      expect(pendingRequests2[1]).to.equal(0);
      expect(pendingRequests2[2]).to.equal(0);
      expect(pendingRequests2[3]).to.equal(0);
      expect(pendingRequests2[4]).to.equal(0);
      expect(await withdrawalProof.totalAmount()).to.equal(0);

      expect(await token.balanceOf(investment.address)).to.equal(0);

      expect(await token.balanceOf(treasury.address)).to.equal(
        withdrawalFee1 + withdrawalFee2
      );

      expect(await token.balanceOf(investor1.address)).to.equal(
        amount1 - fee1 - amount3
      );

      expect(await token.balanceOf(investor2.address)).to.equal(
        amount2 - fee2 - amount4
      );

      expect(await stableToken.balanceOf(investor1.address)).to.equal(
        balanceBefore1.toNumber() + Math.floor(assetAmount1 / 10 ** 12)
      );

      expect(await stableToken.balanceOf(investor2.address)).to.equal(
        balanceBefore2.toNumber() + Math.floor(assetAmount2 / 10 ** 12)
      );

      expect(await withdrawalProof.balanceOf(investor1.address)).to.equal(0);
      expect(await withdrawalProof.balanceOf(investor2.address)).to.equal(0);
    });

    it(" it should not validate a withdrawal requests when its price range is not valid ", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 130_000_000;
      const maxPrice4 = 150_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await investment
        .connect(investor1)
        .withdrawalRequest(
          tokenId,
          amount3,
          minPrice3,
          maxPrice3,
          withdrawalFee1
        );

      await investment
        .connect(investor2)
        .withdrawalRequest(
          tokenId,
          amount4,
          minPrice4,
          maxPrice4,
          withdrawalFee2
        );

      const tokenId3 = await withdrawalProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId4 = await withdrawalProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );

      await investment.connect(manager).startNextEvent();
      const tokenIds2 = [tokenId3, tokenId4];
      const netAmountEvent2 =
        amount3 + amount4 - withdrawalFee1 - withdrawalFee2;

      const balanceBefore1 = await stableToken.balanceOf(investor1.address);
      const balanceBefore2 = await stableToken.balanceOf(investor2.address);

      await investment
        .connect(manager)
        .validateWithdrawals(tokenIds2, netAmountEvent2);

      const tokenPrice = (await investment.tokenPrice()).toNumber();
      const assetAmount1 = Math.floor(
        ((amount3 - withdrawalFee1) * tokenPrice) / scalingFactor
      );
      const assetAmount2 = Math.floor(
        ((amount4 - withdrawalFee2) * tokenPrice) / scalingFactor
      );

      const pendingRequests1 = await withdrawalProof.pendingRequests(tokenId3);
      const pendingRequests2 = await withdrawalProof.pendingRequests(tokenId4);

      expect(pendingRequests1[0]).to.equal(0);
      expect(pendingRequests1[1]).to.equal(0);
      expect(pendingRequests1[2]).to.equal(0);
      expect(pendingRequests1[3]).to.equal(0);
      expect(pendingRequests1[4]).to.equal(0);

      expect(pendingRequests2[0]).to.equal(0);
      expect(pendingRequests2[1]).to.equal(amount4 - withdrawalFee2);
      expect(pendingRequests2[2]).to.equal(minPrice4);
      expect(pendingRequests2[3]).to.equal(maxPrice4);
      expect(pendingRequests2[4]).to.equal(2);
      expect(await withdrawalProof.totalAmount()).to.equal(
        amount4 - withdrawalFee2
      );

      expect(await token.balanceOf(investment.address)).to.equal(
        amount4 - withdrawalFee2
      );

      expect(await token.balanceOf(treasury.address)).to.equal(
        withdrawalFee1 + withdrawalFee2
      );

      expect(await token.balanceOf(investor1.address)).to.equal(
        amount1 - fee1 - amount3
      );

      expect(await token.balanceOf(investor2.address)).to.equal(
        amount2 - fee2 - amount4
      );

      expect(await stableToken.balanceOf(investor1.address)).to.equal(
        balanceBefore1.toNumber() + Math.floor(assetAmount1 / 10 ** 12)
      );

      expect(await stableToken.balanceOf(investor2.address)).to.equal(
        balanceBefore2.toNumber()
      );

      expect(await withdrawalProof.balanceOf(investor1.address)).to.equal(0);
      expect(await withdrawalProof.balanceOf(investor2.address)).to.equal(1);
    });
  });

  describe("sendToSafeHouse", function () {
    it(" it should send asset to the safeHouse", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        safeHouse,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent = amount1 - fee1 + amount2 - fee2;
      await investment.connect(manager).sendToSafeHouse(netAmountEvent);

      expect(await stableToken.balanceOf(safeHouse.address)).to.equal(
        netAmountEvent / 10 ** 12
      );
      expect(await stableToken.balanceOf(investment.address)).to.equal(0);
    });
  });

  describe("mintOrBurnInvestmentFee", function () {
    it(" it should use The treasury balance asset in the case of a negative fee and emit the event MintOrBurnInvestmentFee", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        safeHouse,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent1 = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent1);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 130_000_000;
      const maxPrice4 = 150_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await investment
        .connect(investor1)
        .withdrawalRequest(
          tokenId,
          amount3,
          minPrice3,
          maxPrice3,
          withdrawalFee1
        );

      await investment
        .connect(investor2)
        .withdrawalRequest(
          tokenId,
          amount4,
          minPrice4,
          maxPrice4,
          withdrawalFee2
        );

      const tokenId3 = await withdrawalProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId4 = await withdrawalProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );

      await investment.connect(manager).startNextEvent();
      const tokenIds2 = [tokenId3, tokenId4];
      const netAmountEvent2 =
        amount3 + amount4 - withdrawalFee1 - withdrawalFee2;

      const balanceBefore1 = await stableToken.balanceOf(investor1.address);
      const balanceBefore2 = await stableToken.balanceOf(investor2.address);

      await investment
        .connect(manager)
        .validateWithdrawals(tokenIds2, netAmountEvent2);

      const tokenPrice = (await management.tokenPrice())[0];
      const treasuryBalanceTokenBefore = (
        await token.balanceOf(treasury.address)
      ).toNumber();
      const amount5 = 1_000_000_000;
      await stableToken.connect(owner).mint(treasury.address, amount5);
      const treasuryBalanceAssetBefore = (
        await stableToken.balanceOf(treasury.address)
      ).toNumber();
      const amount = amount1;
      const treasuryBalanceAssetAfter =
        treasuryBalanceAssetBefore - Math.floor(amount / 10 ** 12);

      const treasuryBalanceTokenAfter =
        treasuryBalanceTokenBefore +
        Math.floor((amount * scalingFactor) / tokenPrice.toNumber());

      const investmentBalanceAssetBefore = (
        await stableToken.balanceOf(investment.address)
      ).toNumber();

      const investmentBalanceAssetAfter =
        investmentBalanceAssetBefore + Math.floor(amount / 10 ** 12);

      await expect(
        await investment.connect(manager).mintOrBurnInvestmentFee(amount, true)
      )
        .to.emit(investment, "MintOrBurnInvestmentFee")
        .withArgs(amount, true, 0);

      expect(await stableToken.balanceOf(investment.address)).to.equal(
        investmentBalanceAssetAfter
      );
      expect(await stableToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceAssetAfter
      );

      expect(await token.balanceOf(treasury.address)).to.equal(
        treasuryBalanceTokenAfter
      );
    });

    it(" it should use The treasury balance token in the case of a positive fee and emit the event MintOrBurnInvestmentFee", async function () {
      const {
        treasury,
        stableToken,
        token,
        holdTime,
        management,
        investment,
        depositProof,
        withdrawalProof,
        safeHouse,
        accounts,
        owner,
        manager,
      } = await deployeFixture();
      const investor1 = accounts[4];
      const investor2 = accounts[5];
      const amount1 = 100_000_000_000_000;
      const amount2 = 200_000_000_000_000;
      const minPrice1 = 95_000_000;
      const maxPrice1 = 110_000_000;
      const minPrice2 = 96_000_000;
      const maxPrice2 = 120_000_000;
      const tokenId = 0;
      await stableToken.connect(owner).mint(investor1.address, amount1);
      await stableToken.connect(investor1).approve(investment.address, amount1);
      await stableToken.connect(owner).mint(investor2.address, amount2);
      await stableToken.connect(investor2).approve(investment.address, amount2);
      const fee1 = (await investment.getDepositFee(amount1)).toNumber();
      const fee2 = (await investment.getDepositFee(amount2)).toNumber();
      await investment
        .connect(investor1)
        .depositRequest(
          investor1.address,
          tokenId,
          amount1,
          minPrice1,
          maxPrice1,
          fee1
        );
      await investment
        .connect(investor2)
        .depositRequest(
          investor2.address,
          tokenId,
          amount2,
          minPrice2,
          maxPrice2,
          fee2
        );
      const netAmountEvent1 = amount1 - fee1 + amount2 - fee2;
      const scalingFactor = (await management.SCALING_FACTOR()).toNumber();
      await investment.connect(manager).startNextEvent();
      const tokenId1 = await depositProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId2 = await depositProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );
      const tokenIds = [tokenId1, tokenId2];

      await investment
        .connect(manager)
        .validateDeposits(tokenIds, netAmountEvent1);
      await token
        .connect(investor1)
        .approve(investment.address, amount1 - fee1);
      await token
        .connect(investor2)
        .approve(investment.address, amount2 - fee2);

      const amount3 = 50_000_000_000_000;
      const amount4 = 100_000_000_000_000;
      const minPrice3 = 90_000_000;
      const maxPrice3 = 120_000_000;
      const minPrice4 = 130_000_000;
      const maxPrice4 = 150_000_000;

      const holdTime1 = await holdTime.getHoldTime(investor1.address);
      const holdTime2 = await holdTime.getHoldTime(investor2.address);
      const withdrawalFeeRate1 = (
        await management.getWithdrawalFeeRate(holdTime1)
      ).toNumber();
      const withdrawalFeeRate2 = (
        await management.getWithdrawalFeeRate(holdTime2)
      ).toNumber();
      const withdrawalFee1 = (withdrawalFeeRate1 * amount3) / scalingFactor;
      const withdrawalFee2 = (withdrawalFeeRate2 * amount4) / scalingFactor;

      await investment
        .connect(investor1)
        .withdrawalRequest(
          tokenId,
          amount3,
          minPrice3,
          maxPrice3,
          withdrawalFee1
        );

      await investment
        .connect(investor2)
        .withdrawalRequest(
          tokenId,
          amount4,
          minPrice4,
          maxPrice4,
          withdrawalFee2
        );

      const tokenId3 = await withdrawalProof.tokenOfOwnerByIndex(
        investor1.address,
        0
      );
      const tokenId4 = await withdrawalProof.tokenOfOwnerByIndex(
        investor2.address,
        0
      );

      await investment.connect(manager).startNextEvent();
      const tokenIds2 = [tokenId3, tokenId4];
      const netAmountEvent2 =
        amount3 + amount4 - withdrawalFee1 - withdrawalFee2;

      const balanceBefore1 = await stableToken.balanceOf(investor1.address);
      const balanceBefore2 = await stableToken.balanceOf(investor2.address);

      await investment
        .connect(manager)
        .validateWithdrawals(tokenIds2, netAmountEvent2);

      const tokenPrice = (await management.tokenPrice())[0];
      const treasuryBalanceTokenBefore = (
        await token.balanceOf(treasury.address)
      ).toNumber();
      const amount = treasuryBalanceTokenBefore;

      await stableToken
        .connect(owner)
        .mint(investment.address, Math.floor(amount / 10 ** 12));

      const treasuryBalanceAssetBefore = (
        await stableToken.balanceOf(treasury.address)
      ).toNumber();

      const treasuryBalanceAssetAfter =
        treasuryBalanceAssetBefore + Math.floor(amount / 10 ** 12);

      const treasuryBalanceTokenAfter =
        treasuryBalanceTokenBefore -
        Math.floor((amount * scalingFactor) / tokenPrice.toNumber());

      const investmentBalanceAssetBefore = (
        await stableToken.balanceOf(investment.address)
      ).toNumber();

      const investmentBalanceAssetAfter =
        investmentBalanceAssetBefore - Math.floor(amount / 10 ** 12);

      await expect(
        await investment
          .connect(manager)
          .mintOrBurnInvestmentFee(2 * amount, false)
      )
        .to.emit(investment, "MintOrBurnInvestmentFee")
        .withArgs(2 * amount, false, amount);

      expect(await stableToken.balanceOf(investment.address)).to.equal(
        investmentBalanceAssetAfter
      );
      expect(await stableToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceAssetAfter
      );

      expect(await token.balanceOf(treasury.address)).to.equal(
        treasuryBalanceTokenAfter
      );
    });
  });
});
