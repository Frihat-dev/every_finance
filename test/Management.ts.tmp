import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Management", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployeFixture() {
    // Contracts are deployed using the first signer/account by default
    const accounts = await ethers.getSigners();
    const owner = accounts[0];
    const admin = accounts[1];
    const manager = accounts[2];
    const treasury = accounts[3];
    const Management = await ethers.getContractFactory("Management");
    const management = await Management.deploy(
      admin.address,
      manager.address,
      treasury.address
    );

    return {
      management,
      accounts,
      owner,
      admin,
      manager,
      treasury,
    };
  }

  describe("Deployment", function () {
    it("Should set the DEFAULT_ADMIN_ROLE role ", async function () {
      const { management, owner, admin, manager, treasury } =
        await deployeFixture();
      const ADMIN = await management.DEFAULT_ADMIN_ROLE();
      expect(await management.hasRole(ADMIN, admin.address)).to.equal(true);
    });

    it("Should set the MANAGER role ", async function () {
      const { management, owner, admin, manager, treasury } =
        await deployeFixture();
      const MANAGER = await management.MANAGER();
      expect(await management.hasRole(MANAGER, manager.address)).to.equal(true);
    });

    it("Should set the treasury ", async function () {
      const { management, owner, admin, manager, treasury } =
        await deployeFixture();
      expect(await management.treasury()).to.equal(treasury.address);
    });
  });

  describe("updateTreasury", function () {
    it("Should revert if caller is not admin ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const caller = accounts[4];
      const newTreasury = accounts[5].address;
      await expect(management.connect(caller).updateTreasury(newTreasury)).to.be
        .revertedWith;
    });

    it("Should revert if treasury'address is zero ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const newTreasury = "0x0000000000000000000000000000000000000000";
      await expect(
        management.connect(admin).updateTreasury(newTreasury)
      ).to.be.revertedWith("Every.finance: zero address");
    });

    it("Should update treasury in the storage ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const newTreasury = accounts[5].address;
      await management.connect(admin).updateTreasury(newTreasury);
      expect(await management.treasury()).to.equal(newTreasury);
    });

    it("Should emit the event UpdateTreasury ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const newTreasury = accounts[5].address;
      await expect(management.connect(admin).updateTreasury(newTreasury))
        .to.emit(management, "UpdateTreasury")
        .withArgs(newTreasury);
    });
  });

  describe("updateSafeHouse", function () {
    it("Should revert if caller is not admin ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const caller = accounts[4];
      const newSafeHouse = accounts[5].address;
      await expect(management.connect(caller).updateSafeHouse(newSafeHouse)).to
        .be.revertedWith;
    });

    it("Should revert if SafeHouse'address is zero ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const newSafeHouse = "0x0000000000000000000000000000000000000000";
      await expect(
        management.connect(admin).updateSafeHouse(newSafeHouse)
      ).to.be.revertedWith("Every.finance: zero address");
    });

    it("Should update SafeHouse in the storage ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const newSafeHouse = accounts[5].address;
      await management.connect(admin).updateSafeHouse(newSafeHouse);
      expect(await management.safeHouse()).to.equal(newSafeHouse);
    });

    it("Should emit the event UpdateSafeHouse ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const newSafeHouse = accounts[5].address;
      await expect(management.connect(admin).updateSafeHouse(newSafeHouse))
        .to.emit(management, "UpdateSafeHouse")
        .withArgs(newSafeHouse);
    });
  });

  describe("updateIsCancelDeposit", function () {
    it("Should revert if caller is not manager ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const caller = accounts[4];
      const isCancelDeposit = true;
      await expect(
        management.connect(caller).updateIsCancelDeposit(isCancelDeposit)
      ).to.be.revertedWith;
    });

    it("Should revert if no change for isCancelDeposit", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const isCancelDeposit = false;
      await expect(
        management.connect(manager).updateIsCancelDeposit(isCancelDeposit)
      ).to.be.revertedWith("Every.finance: no change");
    });

    it("Should update isCancelDeposit in the storage ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const isCancelDeposit = true;
      await management.connect(manager).updateIsCancelDeposit(isCancelDeposit);
      expect(await management.isCancelDeposit()).to.equal(isCancelDeposit);
    });

    it("Should emit the event UpdateIsCancelDeposit ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const isCancelDeposit = true;
      await expect(
        management.connect(manager).updateIsCancelDeposit(isCancelDeposit)
      )
        .to.emit(management, "UpdateIsCancelDeposit")
        .withArgs(isCancelDeposit);
    });
  });

  describe("updateIsCancelWithdrawal", function () {
    it("Should revert if caller is not manager ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const caller = accounts[4];
      const isCancelWithdrawal = true;
      await expect(
        management.connect(caller).updateIsCancelWithdrawal(isCancelWithdrawal)
      ).to.be.revertedWith;
    });

    it("Should revert if no change for isCancelWithdrawal ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const isCancelWithdrawal = false;
      await expect(
        management.connect(manager).updateIsCancelWithdrawal(isCancelWithdrawal)
      ).to.be.revertedWith("Every.finance: no change");
    });

    it("Should update isCancelWithdrawal in the storage ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const isCancelWithdrawal = true;
      await management
        .connect(manager)
        .updateIsCancelWithdrawal(isCancelWithdrawal);
      expect(await management.isCancelWithdrawal()).to.equal(
        isCancelWithdrawal
      );
    });

    it("Should emit the event UpdateIsCancelWithdrawal", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const isCancelWithdrawal = true;
      await expect(
        management.connect(manager).updateIsCancelWithdrawal(isCancelWithdrawal)
      )
        .to.emit(management, "UpdateIsCancelWithdrawal")
        .withArgs(isCancelWithdrawal);
    });
  });

  describe("updateDepositFee", function () {
    it("Should revert if caller is not owner ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const caller = accounts[4];
      const depositFeeRate = 10_000_000n;
      const depositFeeMin = 10_000_000_000_000_000_000n;
      const depositFeeMax = 100_000_000_000_000_000_000n;
      await expect(
        management
          .connect(caller)
          .updateDepositFee(depositFeeRate, depositFeeMin, depositFeeMax)
      ).to.be.revertedWith;
    });

    it("Should revert if depositFeeRate is out of range ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const depositFeeRate = 100_000_001n;
      const depositFeeMin = 10_000_000_000_000_000_000n;
      const depositFeeMax = 100_000_000_000_000_000_000n;
      await expect(
        management
          .connect(manager)
          .updateDepositFee(depositFeeRate, depositFeeMin, depositFeeMax)
      ).to.be.revertedWith("Every.finance: out of range");
    });

    it("Should revert if min and max values are wrong ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const depositFeeRate = 10_000_000n;
      const depositFeeMin = 10_000_000_000_000_000_001n;
      const depositFeeMax = 10_000_000_000_000_000_000n;
      await expect(
        management
          .connect(manager)
          .updateDepositFee(depositFeeRate, depositFeeMin, depositFeeMax)
      ).to.be.revertedWith("Every.finance: wrong min max values");
    });

    it("Should update depositFee in the storage ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const depositFeeRate = 10_000_000n;
      const depositFeeMin = 10_000_000_000_000_000_000n;
      const depositFeeMax = 100_000_000_000_000_000_000n;

      await management
        .connect(manager)
        .updateDepositFee(depositFeeRate, depositFeeMin, depositFeeMax);
      const depositFee = await management.depositFee();
      expect(depositFee[0]).to.equal(depositFeeRate);
      expect(depositFee[1]).to.equal(depositFeeMin);
      expect(depositFee[2]).to.equal(depositFeeMax);
    });

    it("Should emit the event UpdateDepositFee ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const depositFeeRate = 10_000_000n;
      const depositFeeMin = 10_000_000_000_000_000_000n;
      const depositFeeMax = 100_000_000_000_000_000_000n;
      await expect(
        management
          .connect(manager)
          .updateDepositFee(depositFeeRate, depositFeeMin, depositFeeMax)
      )
        .to.emit(management, "UpdateDepositFee")
        .withArgs(depositFeeRate, depositFeeMin, depositFeeMax);
    });
  });

  describe("updatePerformanceFeeRate", function () {
    it("Should revert if caller is not admin ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const caller = accounts[4];
      const performanceFeeRate = 10_000_000n;
      await expect(
        management.connect(caller).updatePerformanceFeeRate(performanceFeeRate)
      ).to.be.revertedWith;
    });

    it("Should revert if performanceFeeRate is out of range ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const performanceFeeRate = 100_000_001n;
      await expect(
        management.connect(manager).updatePerformanceFeeRate(performanceFeeRate)
      ).to.be.revertedWith("Every.finance: out of range");
    });

    it("Should update performanceFeeRate in the storage ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const performanceFeeRate = 10_000_000n;
      await management
        .connect(manager)
        .updatePerformanceFeeRate(performanceFeeRate);
      expect(await management.performanceFeeRate()).to.equal(
        performanceFeeRate
      );
    });

    it("Should emit the event UpdatePerformanceFeeRate ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const performanceFeeRate = 10_000_000n;
      await expect(
        management.connect(manager).updatePerformanceFeeRate(performanceFeeRate)
      )
        .to.emit(management, "UpdatePerformanceFeeRate")
        .withArgs(performanceFeeRate);
    });
  });

  describe("updateManagementFeeRate", function () {
    it("Should revert if caller is not manager ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const caller = accounts[4];
      const managementFeeRate = 10_000_000n;
      await expect(
        management.connect(caller).updateManagementFeeRate(managementFeeRate)
      ).to.be.revertedWith;
    });

    it("Should revert if managementFeeRate is out of range ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const managementFeeRate = 100_000_001n;
      await expect(
        management.connect(manager).updateManagementFeeRate(managementFeeRate)
      ).to.be.revertedWith("Every.finance: out of range");
    });

    it("Should update managementFeeRate in the storage ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const managementFeeRate = 10_000_000n;
      await management
        .connect(manager)
        .updateManagementFeeRate(managementFeeRate);
      expect(await management.managementFeeRate()).to.equal(managementFeeRate);
    });

    it("Should emit the event UpdateManagementFeeRate ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const managementFeeRate = 10_000_000n;
      await expect(
        management.connect(manager).updateManagementFeeRate(managementFeeRate)
      )
        .to.emit(management, "UpdateManagementFeeRate")
        .withArgs(managementFeeRate);
    });
  });

  describe("updateMinDepositAmount", function () {
    it("Should revert if caller is not manager ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const caller = accounts[4];
      const minDepositAmount = 100_000_000_000_000_000_000n;
      await expect(
        management.connect(caller).updateMinDepositAmount(minDepositAmount)
      ).to.be.revertedWith;
    });

    it("Should revert if minDepositFee is higher than minDepositAmount ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const minDepositAmount = 100_000_000_000_000_000_000n;
      const depositFeeRate = 10_000_000n;
      const depositFeeMin = 100_000_000_000_000_000_001n;
      const depositFeeMax = 200_000_000_000_000_000_000n;
      await management
        .connect(manager)
        .updateDepositFee(depositFeeRate, depositFeeMin, depositFeeMax);
      await expect(
        management.connect(manager).updateMinDepositAmount(minDepositAmount)
      ).to.be.revertedWith("Every.finance: lower than min deposit fee");
    });

    it("Should update minDepositAmount in the storage ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const minDepositAmount = 100_000_000_000_000_000_000n;
      await management
        .connect(manager)
        .updateMinDepositAmount(minDepositAmount);
      expect(await management.minDepositAmount()).to.equal(minDepositAmount);
    });

    it("Should emit the event UpdateMinDepositAmount ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const minDepositAmount = 100_000_000_000_000_000_000n;
      await expect(
        management.connect(manager).updateMinDepositAmount(minDepositAmount)
      )
        .to.emit(management, "UpdateMinDepositAmount")
        .withArgs(minDepositAmount);
    });
  });

  describe("updateTokenPrice", function () {
    it("Should revert if caller is not oracle", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const caller = accounts[4];
      const tokenPrice = 10_000_000;
      await expect(management.connect(caller).updateTokenPrice(tokenPrice)).to
        .be.revertedWith;
    });

    it("Should update tokenPrice in the storage", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const tokenPrice = 10_000_000;
      const ORACLE = await management.ORACLE();
      const oracle = accounts[4];
      await management.connect(admin).grantRole(ORACLE, oracle.address);
      await management.connect(oracle).updateTokenPrice(tokenPrice);
      const lastTime = await time.latest();
      const tokenPrice2 = await management.tokenPrice();
      expect(tokenPrice2[0]).to.equal(tokenPrice);
      expect(tokenPrice2[1]).to.equal(lastTime);
    });

    it("Should emit the event UpdateTokenPrice ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const tokenPrice = 10_000_000;
      const ORACLE = await management.ORACLE();
      const oracle = accounts[4];
      await management.connect(admin).grantRole(ORACLE, oracle.address);
      await expect(
        management.connect(oracle).updateTokenPrice(tokenPrice)
      ).to.emit(management, "UpdateTokenPrice").withArgs;
    });
  });

  describe("addWithdrawalFee", function () {
    it("Should revert if caller is not owner", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const caller = accounts[4];
      const feeRate = 10_000_000;
      const feePeriod = 1000;
      await expect(
        management.connect(caller).addWithdrawalFee(feeRate, feePeriod)
      ).to.be.revertedWith;
    });

    it("Should revert if feeRate is out of range ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate = 100_000_001;
      const feePeriod = 1000;
      await expect(
        management.connect(manager).addWithdrawalFee(feeRate, feePeriod)
      ).to.be.revertedWith("Every.finance: out of range");
    });

    it("Should update withdrawalFee when the first fee is added", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate = 10_000_000;
      const feePeriod = 1000;
      await management.connect(manager).addWithdrawalFee(feeRate, feePeriod);
      expect(await management.getWithdrawalFeeSize()).to.equal(1);
      const fee = await management.getWithdrawalFee(0);
      expect(fee[0]).to.equal(feeRate);
      expect(fee[1]).to.equal(feePeriod);
    });

    it("Should revert when two fee are added but they don't match in FeeRate", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_000;
      const feePeriod1 = 1000;
      const feeRate2 = 10_000_001;
      const feePeriod2 = 1001;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await expect(
        management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2)
      ).to.be.revertedWith("Every.finance: fee rates don't match");
    });

    it("Should revert when two fee are added but they don't match in time", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_001;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_000;
      const feePeriod2 = 1000;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await expect(
        management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2)
      ).to.be.revertedWith("Every.finance: times don't match");
    });

    it("Should update withdrawalFee when two fee are added", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_001;
      const feePeriod1 = 1000;
      const feeRate2 = 10_000_000;
      const feePeriod2 = 10001;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      expect(await management.getWithdrawalFeeSize()).to.equal(2);
      const fee1 = await management.getWithdrawalFee(0);
      const fee2 = await management.getWithdrawalFee(1);
      expect(fee1[0]).to.equal(feeRate1);
      expect(fee1[1]).to.equal(feePeriod1);
      expect(fee2[0]).to.equal(feeRate2);
      expect(fee2[1]).to.equal(feePeriod2);
    });

    it("Should emit the event AddWithdrawalFee when the first fee is added", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate = 10_000_000;
      const feePeriod = 1000;
      await expect(
        management.connect(manager).addWithdrawalFee(feeRate, feePeriod)
      )
        .to.emit(management, "AddWithdrawalFee")
        .withArgs(feeRate, feePeriod);
    });

    it("Should emit the event AddWithdrawalFee when the second fee is added", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_001;
      const feePeriod1 = 1000;
      const feeRate2 = 10_000_000;
      const feePeriod2 = 10001;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await expect(
        management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2)
      )
        .to.emit(management, "AddWithdrawalFee")
        .withArgs(feeRate2, feePeriod2);
    });
  });
  describe("updateWithdrawalFee", function () {
    it("Should revert if caller is not owner", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const caller = accounts[3];
      const feeRate1 = 10_000_000;
      const feePeriod1 = 1000;
      await expect(
        management.connect(caller).updateWithdrawalFee(0, feeRate1, feePeriod1)
      ).to.be.revertedWith;
    });

    it("Should revert if index is out of size ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate = 10_000_000;
      const feePeriod = 1000;
      const index = 1;
      await management.connect(manager).addWithdrawalFee(feeRate, feePeriod);
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate, feePeriod)
      ).to.be.revertedWith("Every.finance: out of size");
    });

    it("Should revert if feeRate is out of range ", async function () {
      const { management, accounts, owner, amin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_000;
      const feeRate2 = 100_000_001;
      const feePeriod = 1000;
      const index = 1;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod);
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate2, feePeriod)
      ).to.be.revertedWith("Every.finance: out of range");
    });

    it("Should revert if withdrawalFee is empty  ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate = 10_000_000;
      const feePeriod = 1000;
      const index = 0;
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate, feePeriod)
      ).to.be.revertedWith("Every.finance: out of size");
    });

    it("Should update withdrawalFee when it has just one fee", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_000;
      const feePeriod1 = 1000;
      const feeRate2 = 20_000_000;
      const feePeriod2 = 2000;
      const index = 0;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management
        .connect(manager)
        .updateWithdrawalFee(index, feeRate2, feePeriod2);
      expect(await management.getWithdrawalFeeSize()).to.equal(1);
      const fee = await management.getWithdrawalFee(0);
      expect(fee[0]).to.equal(feeRate2);
      expect(fee[1]).to.equal(feePeriod2);
    });

    it("Should revert when update the first index but fee don't match ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_003;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;
      const feeRate = 10_000_001;
      const feePeriod = 1000;
      const index = 0;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate, feePeriod)
      ).to.be.revertedWith("Every.finance: fee rates don't match");
    });

    it("Should revert when update the first index but times don't match ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_003;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;
      const feeRate = 10_000_003;
      const feePeriod = 1003;
      const index = 0;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate, feePeriod)
      ).to.be.revertedWith("Every.finance: times don't match");
    });

    it("Should revert when update the second index but fee don't match ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_003;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;
      const feeRate = 10_000_004;
      const feePeriod = 10002;
      const index = 1;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate, feePeriod)
      ).to.be.revertedWith("Every.finance: fee rates don't match");
    });

    it("Should revert when update the second index but times don't match ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_003;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;
      const feeRate = 10_000_002;
      const feePeriod = 1000;
      const index = 1;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate, feePeriod)
      ).to.be.revertedWith("Every.finance: times don't match");
    });

    it("Should revert when update the second index but times don't match ", async function () {
      const { management, accounts, owner, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_003;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;
      const feeRate = 10_000_002;
      const feePeriod = 1004;
      const index = 1;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate, feePeriod)
      ).to.be.revertedWith("Every.finance: times don't match");
    });

    it("Should revert when update the last index but fee don't match ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_003;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;
      const feeRate = 10_000_003;
      const feePeriod = 1003;
      const index = 2;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate, feePeriod)
      ).to.be.revertedWith("Every.finance: fee rates don't match");
    });

    it("Should revert when update the last index but times don't match ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_003;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;
      const feeRate = 10_000_001;
      const feePeriod = 1001;
      const index = 2;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate, feePeriod)
      ).to.be.revertedWith("Every.finance: times don't match");
    });

    it("Should update withdrawalFee when the first fee is updated", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_003;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;
      const feeRate = 10_000_004;
      const feePeriod = 1000;
      const index = 0;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await management
        .connect(manager)
        .updateWithdrawalFee(index, feeRate, feePeriod);
      expect(await management.getWithdrawalFeeSize()).to.equal(3);
      const fee1 = await management.getWithdrawalFee(0);
      const fee2 = await management.getWithdrawalFee(1);
      const fee3 = await management.getWithdrawalFee(2);
      expect(fee1[0]).to.equal(feeRate);
      expect(fee1[1]).to.equal(feePeriod);
      expect(fee2[0]).to.equal(feeRate2);
      expect(fee2[1]).to.equal(feePeriod2);
      expect(fee3[0]).to.equal(feeRate3);
      expect(fee3[1]).to.equal(feePeriod3);
    });

    it("Should update withdrawalFee when the second fee is updated", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_004;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_003;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1004;
      const feeRate = 10_000_002;
      const feePeriod = 1003;
      const index = 1;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await management
        .connect(manager)
        .updateWithdrawalFee(index, feeRate, feePeriod);
      expect(await management.getWithdrawalFeeSize()).to.equal(3);
      const fee1 = await management.getWithdrawalFee(0);
      const fee2 = await management.getWithdrawalFee(1);
      const fee3 = await management.getWithdrawalFee(2);
      expect(fee1[0]).to.equal(feeRate1);
      expect(fee1[1]).to.equal(feePeriod1);
      expect(fee2[0]).to.equal(feeRate);
      expect(fee2[1]).to.equal(feePeriod);
      expect(fee3[0]).to.equal(feeRate3);
      expect(fee3[1]).to.equal(feePeriod3);
    });

    it("Should update withdrawalFee when the last fee is updated", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_004;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;
      const feeRate = 10_000_000;
      const feePeriod = 1004;
      const index = 2;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await management
        .connect(manager)
        .updateWithdrawalFee(index, feeRate, feePeriod);
      expect(await management.getWithdrawalFeeSize()).to.equal(3);
      const fee1 = await management.getWithdrawalFee(0);
      const fee2 = await management.getWithdrawalFee(1);
      const fee3 = await management.getWithdrawalFee(2);
      expect(fee1[0]).to.equal(feeRate1);
      expect(fee1[1]).to.equal(feePeriod1);
      expect(fee2[0]).to.equal(feeRate2);
      expect(fee2[1]).to.equal(feePeriod2);
      expect(fee3[0]).to.equal(feeRate);
      expect(fee3[1]).to.equal(feePeriod);
    });

    it("Should emit the event UpateWithdrawalFee when the first fee is updated", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_003;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;
      const feeRate = 10_000_004;
      const feePeriod = 1000;
      const index = 0;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate, feePeriod)
      )
        .to.emit(management, "UpdateWithdrawalFee")
        .withArgs(index, feeRate, feePeriod);
    });

    it("Should emit the event UpateWithdrawalFee when the second fee is updated", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_004;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_003;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1004;
      const feeRate = 10_000_002;
      const feePeriod = 1003;
      const index = 1;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate, feePeriod)
      )
        .to.emit(management, "UpdateWithdrawalFee")
        .withArgs(index, feeRate, feePeriod);
    });

    it("Should emit the event UpateWithdrawalFee when the last fee is updated", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_004;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;
      const feeRate = 10_000_000;
      const feePeriod = 1004;
      const index = 2;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await expect(
        management
          .connect(manager)
          .updateWithdrawalFee(index, feeRate, feePeriod)
      )
        .to.emit(management, "UpdateWithdrawalFee")
        .withArgs(index, feeRate, feePeriod);
    });
  });

  describe("deleteLastWithdrawalFee", function () {
    it("Should revert if caller is not manager", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const caller = accounts[4];
      await expect(management.connect(caller).deleteLastWithdrawalFee()).to.be
        .revertedWith;
    });

    it("Should revert if withdrawalFee is empty ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate = 10_000_000;
      const feePeriod = 1000;
      await expect(
        management.connect(manager).deleteLastWithdrawalFee()
      ).to.be.revertedWith("Every.finance. array is empty");
    });

    it("Should update withdrawalFee when it has just one ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate = 10_000_000;
      const feePeriod = 1000;
      await management.connect(manager).addWithdrawalFee(feeRate, feePeriod);
      await management.connect(manager).deleteLastWithdrawalFee();
      expect(await management.getWithdrawalFeeSize()).to.equal(0);
    });

    it("Should update withdrawalFee when it has many fee ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_003;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;

      const index = 2;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await management.connect(manager).deleteLastWithdrawalFee();
      expect(await management.getWithdrawalFeeSize()).to.equal(2);
      const fee1 = await management.getWithdrawalFee(0);
      const fee2 = await management.getWithdrawalFee(1);
      expect(fee1[0]).to.equal(feeRate1);
      expect(fee1[1]).to.equal(feePeriod1);
      expect(fee2[0]).to.equal(feeRate2);
      expect(fee2[1]).to.equal(feePeriod2);
    });

    it("Should emit the event LastWithdrawalFee", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 10_000_003;
      const feePeriod1 = 1001;
      const feeRate2 = 10_000_002;
      const feePeriod2 = 1002;
      const feeRate3 = 10_000_001;
      const feePeriod3 = 1003;

      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      await expect(management.connect(manager).deleteLastWithdrawalFee())
        .to.emit(management, "DeleteLastWithdrawalFee")
        .withArgs(feeRate3, feePeriod3);
    });
  });

  describe("calculateWithdrawalFeeRateRateRateRate", function () {
    it("Should returns zero  when withdrawalFee is empty ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const holdTime = (await time.latest()) - 1000;
      const expectedFeeRate = 0;
      const feeRate = await management.calculateWithdrawalFeeRate(holdTime);
      expect(feeRate).to.equal(expectedFeeRate);
    });

    it("Should returns feeRate if holdTime is lower than fee time in the case of just one fee ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 30_000_000;
      const feePeriod1 = 1000;

      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);

      const holdTime = (await time.latest()) - 900;
      const expectedFeeRate = feeRate1;
      const feeRate = await management.calculateWithdrawalFeeRate(holdTime);
      expect(feeRate).to.equal(expectedFeeRate);
    });

    it("Should returns zero if holdTime is higher than fee time in the case of just one fee ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 30_000_000;
      const feePeriod1 = 1000;

      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);

      const holdTime = (await time.latest()) - 1100;
      const expectedFeeRate = 0;
      const feeRate = await management.calculateWithdrawalFeeRate(holdTime);
      expect(feeRate).to.equal(expectedFeeRate);
    });

    it("Should returns first feeRate if holdTime is lower than first fee time in the case of many fee", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 30_000_000;
      const feePeriod1 = 1000;
      const feeRate2 = 20_000_000;
      const feePeriod2 = 2000;
      const feeRate3 = 10_000_000;
      const feePeriod3 = 3000;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
      const holdTime = (await time.latest()) - 900;
      const expectedFeeRate = feeRate1;
      const feeRate = await management.calculateWithdrawalFeeRate(holdTime);
      expect(feeRate).to.equal(expectedFeeRate);
    });

    it("Should returns zero if holdTime is higher than last fee time in the case of many fee ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 30_000_000;
      const feePeriod1 = 1000;
      const feeRate2 = 20_000_000;
      const feePeriod2 = 2000;
      const feeRate3 = 10_000_000;
      const feePeriod3 = 3000;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);

      const holdTime = (await time.latest()) - 3100;
      const expectedFeeRate = 0;
      const feeRate = await management.calculateWithdrawalFeeRate(holdTime);
      expect(feeRate).to.equal(expectedFeeRate);
    });

    it("Should returns seconde feeRate if holdTime is between time1 and time2 ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 30_000_000;
      const feePeriod1 = 1000;
      const feeRate2 = 20_000_000;
      const feePeriod2 = 2000;
      const feeRate3 = 10_000_000;
      const feePeriod3 = 3000;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);

      const holdTime = (await time.latest()) - 1500;
      const expectedFeeRate = feeRate2;
      const feeRate = await management.calculateWithdrawalFeeRate(holdTime);
      expect(feeRate).to.equal(expectedFeeRate);
    });

    it("Should returns third feeRate if holdTime is between time2 and time3 ", async function () {
      const { management, accounts, owner, admin, manager, treasury } =
        await deployeFixture();
      const feeRate1 = 30_000_000;
      const feePeriod1 = 1000;
      const feeRate2 = 20_000_000;
      const feePeriod2 = 2000;
      const feeRate3 = 10_000_000;
      const feePeriod3 = 3000;
      await management.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
      await management.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
      await management.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);

      const holdTime = (await time.latest()) - 2500;
      const expectedFeeRate = feeRate3;
      const feeRate = await management.calculateWithdrawalFeeRate(holdTime);
      expect(feeRate).to.equal(expectedFeeRate);
    });
  });
});
