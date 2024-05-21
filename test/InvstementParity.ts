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
    const treasury = accounts[5];
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
    const holdTimeAlpha = await HoldTime.deploy();
    const holdTimeBeta = await HoldTime.deploy();
    const holdTimeGamma = await HoldTime.deploy();
    const Token = await ethers.getContractFactory("contracts/common/Token.sol:Token");
    const tokenAlpha = await Token.deploy(
      "ALPHA",
      "ALPHA",
      holdTimeAlpha.target,
      admin.address
    );
    const tokenBeta = await Token.deploy(
      "BETA",
      "BETA",
      holdTimeBeta.target,
      admin.address
    );
    const tokenGamma = await Token.deploy(
      "GAMMA",
      "GAMMA",
      holdTimeGamma.target,
      admin.address
    );


    holdTimeAlpha.connect(owner).updateToken(tokenAlpha.target);
    holdTimeBeta.connect(owner).updateToken(tokenBeta.target);
    holdTimeGamma.connect(owner).updateToken(tokenGamma.target);

    const DepositProof = await ethers.getContractFactory("Proof");
    const depositProofAlpha = await DepositProof.deploy(
      "DALPHA",
      "DALPHA",
      1,
      admin.address
    );

    const depositProofBeta = await DepositProof.deploy(
      "DBETA",
      "DBETA",
      1,
      admin.address
    );

    const depositProofGamma = await DepositProof.deploy(
      "DGAMMA",
      "DGAMMA",
      1,
      admin.address
    );


    const WithdrawalProof = await ethers.getContractFactory("Proof");
    const withdrawalProofAlpha = await WithdrawalProof.deploy(
      "WALPHA",
      "WALPHA",
      0,
      admin.address
    );
    const withdrawalProofBeta = await WithdrawalProof.deploy(
      "WBETA",
      "WBETA",
      0,
      admin.address
    );
    const withdrawalProofGamma = await WithdrawalProof.deploy(
      "WGAMMA",
      "WGAMMA",
      0,
      admin.address
    );
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasuryAlpha = await Treasury.deploy(admin.address);
    const treasuryBeta = await Treasury.deploy(admin.address);
    const treasuryGamma = await Treasury.deploy(admin.address);

    const Management = await ethers.getContractFactory("Management");
    const managementAlpha = await Management.deploy(
      admin.address,
      manager.address,
      treasuryAlpha.target
    );

    const managementBeta = await Management.deploy(
      admin.address,
      manager.address,
      treasuryBeta.target
    );

    const managementGamma = await Management.deploy(
      admin.address,
      manager.address,
      treasuryGamma.target
    );

    const AssetBook = await ethers.getContractFactory("AssetBook");
    const assetBookAlpha = await AssetBook.deploy(admin.address, manager.address);
    const assetBookBeta = await AssetBook.deploy(admin.address, manager.address);
    const assetBookGamma = await AssetBook.deploy(admin.address, manager.address);
    const SafeHouse = await ethers.getContractFactory("contracts/common/SafeHouse.sol:SafeHouse");
    const safeHouseAlpha = await SafeHouse.deploy(
      assetBookAlpha.target,
      admin.address,
      manager.address
    );

    const safeHouseBeta = await SafeHouse.deploy(
      assetBookBeta.target,
      admin.address,
      manager.address
    );

    const safeHouseGamma = await SafeHouse.deploy(
      assetBookGamma.target,
      admin.address,
      manager.address
    );

    const StableToken = await ethers.getContractFactory("StableToken");
    const stableToken = await StableToken.deploy(decimals);

    const Investment = await ethers.getContractFactory("Investment");
    const investmentAlpha = await Investment.deploy(
      0,
      stableToken.target,
      tokenAlpha.target,
      managementAlpha.target,
      depositProofAlpha.target,
      withdrawalProofAlpha.target,
      admin.address
    );
    const investmentBeta = await Investment.deploy(
      1,
      stableToken.target,
      tokenBeta.target,
      managementBeta.target,
      depositProofBeta.target,
      withdrawalProofBeta.target,
      admin.address
    );



    const investmentGamma = await Investment.deploy(
      2,
      stableToken.target,
      tokenGamma.target,
      managementGamma.target,
      depositProofGamma.target,
      withdrawalProofGamma.target,
      admin.address
    );

    const INVESTMENT = await depositProofAlpha.INVESTMENT();
    const WITHDRAWER = await treasuryAlpha.WITHDRAWER();
    await depositProofAlpha.connect(admin).updateInvestment(investmentAlpha.target);
    await depositProofBeta.connect(admin).updateInvestment(investmentBeta.target)
    await depositProofGamma.connect(admin).updateInvestment(investmentGamma.target)
    await withdrawalProofAlpha.connect(admin).updateInvestment(investmentAlpha.target);
    await withdrawalProofBeta.connect(admin).updateInvestment(investmentBeta.target);
    await withdrawalProofGamma.connect(admin).updateInvestment(investmentGamma.target);
    await tokenAlpha.connect(admin).updateInvestment(investmentAlpha.target);
    await tokenBeta.connect(admin).updateInvestment(investmentBeta.target);
    await tokenGamma.connect(admin).updateInvestment(investmentGamma.target);
    await treasuryAlpha.connect(admin).grantRole(WITHDRAWER, investmentAlpha.target);
    await treasuryBeta.connect(admin).grantRole(WITHDRAWER, investmentBeta.target);
    await treasuryGamma.connect(admin).grantRole(WITHDRAWER, investmentGamma.target);
    const MANAGER = await investmentAlpha.MANAGER();
    await investmentAlpha.connect(admin).grantRole(MANAGER, manager.address);
    await investmentBeta.connect(admin).grantRole(MANAGER, manager.address);
    await investmentGamma.connect(admin).grantRole(MANAGER, manager.address);
    await investmentAlpha.connect(admin).updateEventBatchSize(eventBatchSize);
    await investmentBeta.connect(admin).updateEventBatchSize(eventBatchSize);
    await investmentGamma.connect(admin).updateEventBatchSize(eventBatchSize);

    const ORACLE = await managementAlpha.ORACLE();
    await managementAlpha.connect(admin).grantRole(ORACLE, manager.address);
    await managementBeta.connect(admin).grantRole(ORACLE, manager.address);
    await managementGamma.connect(admin).grantRole(ORACLE, manager.address);
    await managementAlpha.connect(manager).updateIsCancelDeposit(isCancelDeposit);
    await managementBeta.connect(manager).updateIsCancelDeposit(isCancelDeposit);
    await managementGamma.connect(manager).updateIsCancelDeposit(isCancelDeposit);
    await managementAlpha.connect(manager).updateIsCancelWithdrawal(isCancelWithdrawal);
    await managementBeta.connect(manager).updateIsCancelWithdrawal(isCancelWithdrawal);
    await managementGamma.connect(manager).updateIsCancelWithdrawal(isCancelWithdrawal);

    await managementAlpha
      .connect(manager)
      .updateDepositFee(depositFeeRate, minDepositFee, maxDepositFee);
      await managementBeta
      .connect(manager)
      .updateDepositFee(depositFeeRate, minDepositFee, maxDepositFee);
      await managementGamma
      .connect(manager)
      .updateDepositFee(depositFeeRate, minDepositFee, maxDepositFee);

    await managementAlpha
      .connect(manager)
      .updatePerformanceFeeRate(performanceFeeRate);

      await managementBeta
      .connect(manager)
      .updatePerformanceFeeRate(performanceFeeRate);

      await managementGamma
      .connect(manager)
      .updatePerformanceFeeRate(performanceFeeRate);

    await managementAlpha
      .connect(manager)
      .updateManagementFeeRate(managementFeeRate);


      await managementBeta
      .connect(manager)
      .updateManagementFeeRate(managementFeeRate);

      await managementGamma
      .connect(manager)
      .updateManagementFeeRate(managementFeeRate);


    await managementAlpha.connect(manager).updateTokenPrice(tokenPrice);
    await managementBeta.connect(manager).updateTokenPrice(tokenPrice);
    await managementGamma.connect(manager).updateTokenPrice(tokenPrice);

    await managementAlpha.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
    await managementAlpha.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
    await managementAlpha.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
    await managementAlpha.connect(admin).updateSafeHouse(safeHouseAlpha.target);


    await managementBeta.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
    await managementBeta.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
    await managementBeta.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
    await managementBeta.connect(admin).updateSafeHouse(safeHouseBeta.target);


    await managementGamma.connect(manager).addWithdrawalFee(feeRate1, feePeriod1);
    await managementGamma.connect(manager).addWithdrawalFee(feeRate2, feePeriod2);
    await managementGamma.connect(manager).addWithdrawalFee(feeRate3, feePeriod3);
    await managementGamma.connect(admin).updateSafeHouse(safeHouseGamma.target);

    const TokenParityLogic = await ethers.getContractFactory("TokenParityLogic");
    const tokenParityLogic = await TokenParityLogic.deploy();

    const TokenParityStorage = await ethers.getContractFactory("TokenParityStorage");
    const tokenParityStorage = await TokenParityStorage.deploy(tokenParityLogic.target);

    const TokenParityView = await ethers.getContractFactory("TokenParityView");
    const tokenParityView = await TokenParityView.deploy();

    const TokenParity = await ethers.getContractFactory("TokenParity");
    const tokenParity = await TokenParity.deploy(tokenParityStorage.target, tokenParityView.target);

    const ParityLine = await ethers.getContractFactory("ParityLine");
    const parityLine = await ParityLine.deploy(admin.address);

    const ManagementParityParams = await ethers.getContractFactory("ManagementParityParams");
    const managementParityParams = await ManagementParityParams.deploy(admin.address, admin.address);

    const SafeHouseParity = await ethers.getContractFactory("SafeHouseParity");
    const safeHouseParity = await SafeHouseParity.deploy(admin.address, manager.address);

    const ManagementParity = await ethers.getContractFactory("ManagementParity");
    const managementParity = await ManagementParity.deploy(admin.address, manager.address, managementParityParams.target, tokenParity.target, 
      tokenParityStorage.target, tokenParityView.target, investmentAlpha.target, 
       investmentBeta.target, investmentGamma.target, stableToken.target, safeHouseParity.target);

    const InvestmentParity = await ethers.getContractFactory("InvestmentParity");
    const investmentParity= await InvestmentParity.deploy(admin.address,
      manager.address,
      managementParity.target,
      parityLine.target);

    await tokenParityStorage.setTokenParity(tokenParity.target);
    await tokenParityStorage.setInvestmentParity(investmentParity.target);
    await tokenParityStorage.setSafeHouse(safeHouseParity.target);
    await tokenParityStorage.setmanagementParity(managementParity.target, managementParityParams.target);
    await tokenParityView.setTokenParityStorage(tokenParityStorage.target);
    await tokenParity.updateInvestment(investmentParity.target);
    await safeHouseParity.connect(admin).setManagementParity(managementParity.target);
    await managementParityParams.connect(admin).grantRole(MANAGER, manager.address);
    await managementParityParams.connect(manager).setDepositMinAmount(ethers.parseUnits("100","ether"));
    await managementParityParams.connect(manager).updateDepositFee(ethers.parseUnits("0.005","ether"), 0, ethers.parseUnits("1000","ether"));
    await managementParityParams.connect(manager).updateRebalancingFee(ethers.parseUnits("0.01","ether"), 0, ethers.parseUnits("1000","ether"));
    await managementParityParams.connect(manager).setFixedWithdrawalFee(ethers.parseUnits("0.01","ether"));
    await managementParityParams.connect(manager).addVariableWithdrawalFee(ethers.parseUnits("0.1","ether"), feePeriod1);
    await managementParityParams.connect(manager).addVariableWithdrawalFee(ethers.parseUnits("0.05","ether"), feePeriod2);
    await managementParityParams.connect(manager).addVariableWithdrawalFee(ethers.parseUnits("0.02","ether"), feePeriod3);
    await investmentParity.connect(manager).setDefaultRisk(ethers.parseUnits("0.1","ether"), ethers.parseUnits("0.25","ether"), ethers.parseUnits("0.45","ether"));
    await investmentAlpha.connect(admin).updateManagementParity(managementParity.target);
    await investmentBeta.connect(admin).updateManagementParity(managementParity.target);
    await investmentGamma.connect(admin).updateManagementParity(managementParity.target);
    await tokenAlpha.connect(admin).approve(safeHouseParity.target, ethers.parseUnits("1000000","ether"));
    await tokenBeta.connect(admin).approve(safeHouseParity.target, ethers.parseUnits("1000000","ether"));
    await tokenGamma.connect(admin).approve(safeHouseParity.target, ethers.parseUnits("1000000","ether"));
    
    return {
      investmentParity,
      tokenParityStorage,
      managementParity,
      safeHouseParity,
      investmentAlpha, 
      investmentBeta,
      investmentGamma,
      stableToken,
      tokenParityView,
      accounts,
      owner,
      admin,
      manager,
      managementAlpha,
      managementBeta,
      managementGamma
    };
  }

  describe("investmentParity ", function () {
    it("investmentParity  ", async function () {
      const {
        investmentParity,
        tokenParityStorage,
        managementParity,
        safeHouseParity,
        stableToken,
        tokenParityView,
        accounts,
        owner,
        admin,
        manager,
      } = await deployeFixture();
     
      await stableToken.mint(owner.address, ethers.parseUnits("1000","ether"));
      await stableToken.connect(owner).approve(investmentParity.target, ethers.parseUnits("1000","ether"));
      await investmentParity.connect(owner).depositRequestWithLowRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
      await investmentParity.connect(owner).depositRequestWithLowRisk(owner.address, ethers.parseUnits("1000","ether"), 1);
      await investmentParity.connect(owner).depositRequestWithLowRisk(owner.address, ethers.parseUnits("1000","ether"), 1);
      console.log("netValue", await investmentParity.getTotalNetTokenValue(1));
      console.log("totalValue", await investmentParity.getTotalTokenValue(1));
      console.log("depositBalance", await tokenParityStorage.depositBalance());
      console.log("depositBalancePerToken", await tokenParityStorage.depositBalancePerToken(1));
      console.log("depositBalancePerTokenPerEvent", await tokenParityStorage.depositBalancePerTokenPerEvent(1, 0));

      await investmentParity.connect(owner).rebalanceRequest([1, ethers.parseUnits("1000","ether"), 3, 0, 0, [ethers.parseUnits("0.2","ether"), ethers.parseUnits("0.4","ether"), ethers.parseUnits("0.4","ether")]]);
      
      console.log("netValue", await investmentParity.getTotalNetTokenValue(1));
      console.log("totalValue", await investmentParity.getTotalTokenValue(1));
      console.log("depositBalance", await tokenParityStorage.depositBalance());
      console.log("depositBalancePerToken", await tokenParityStorage.depositBalancePerToken(1));
      console.log("depositBalancePerTokenPerEvent", await tokenParityStorage.depositBalancePerTokenPerEvent(1, 0));
   
      await investmentParity.connect(owner).depositRequestWithMediumRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
      await investmentParity.connect(owner).rebalanceRequest([2, ethers.parseUnits("1000","ether"), 3, 0, 0, [ethers.parseUnits("0.3","ether"), ethers.parseUnits("0.2","ether"), ethers.parseUnits("0.5","ether")]]);
     // await investmentParity.connect(owner).rebalanceRequest([1, ethers.parseUnits("1000","ether"), 3, 0, 0, [ethers.parseUnits("0.2","ether"), ethers.parseUnits("0.4","ether"), ethers.parseUnits("0.4","ether")]]);
;
      await investmentParity.connect(manager).validateRebalancingRequest([1, 2]);
      console.log(await tokenParityStorage.tokenIdsToRebalance(1));
      console.log(await tokenParityStorage.getRebalancingRequest(1))
      console.log("netValue", await investmentParity.getTotalNetTokenValue(1));
      console.log("totalValue", await investmentParity.getTotalTokenValue(1));
      console.log("netValue", await investmentParity.getTotalNetTokenValue(2));
      console.log("depositBalance", await tokenParityStorage.depositBalance());
      console.log("depositBalancePerToken", await tokenParityStorage.depositBalancePerToken(1));
      console.log("depositBalancePerTokenPerEvent", await tokenParityStorage.depositBalancePerTokenPerEvent(1, 0));
      
      console.log(await tokenParityStorage.tokenIdsToRebalance(2));
      console.log(await tokenParityStorage.getRebalancingRequest(2));
      console.log(await tokenParityStorage.weightsPerToken(2));
      await investmentParity.connect(owner).withdrawRequest(1, ethers.parseUnits("0.5","ether"));
      await investmentParity.connect(owner).withdrawRequest(2, ethers.parseUnits("1","ether"));
      const tvl = await investmentParity.connect(owner).getTotalTokenValue(2);
      console.log(tvl);
      const tvlNet = await investmentParity.connect(owner).getTotalNetTokenValue(2);
      console.log(tvlNet);
      console.log(await investmentParity.connect(owner).getRebalancingFee(2));
      console.log(await investmentParity.connect(owner).getWithdrawalFee(2, ethers.parseUnits("0.5","ether")));
      console.log(await investmentParity.connect(owner).getParityTVL());
  }); 
  
}); 

describe("managementParity ", function () {
  it("deposit case  ", async function () {
    const {
      investmentParity,
      tokenParityStorage,
      managementParity,
      safeHouseParity,
      investmentAlpha, 
      investmentBeta,
      investmentGamma,
      stableToken,
      tokenParityView,
      accounts,
      owner,
      admin,
      manager,
      managementAlpha,
      managementBeta,
      managementGamma
    } = await deployeFixture();
   
    await stableToken.mint(owner.address, ethers.parseUnits("1000","ether"));
    await stableToken.connect(owner).approve(investmentParity.target, ethers.parseUnits("1000","ether"));
    await investmentParity.connect(owner).depositRequestWithLowRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
    await investmentParity.connect(owner).depositRequestWithMediumRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
    await investmentParity.connect(owner).depositRequestWithHighRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
    await investmentParity.connect(owner).depositRequest(owner.address, [0,  ethers.parseUnits("1000","ether"), 3, 0, 0, [ethers.parseUnits("0.5","ether"), ethers.parseUnits("0.3","ether"), ethers.parseUnits("0.2","ether")]]);
    
    await investmentParity.connect(owner).rebalanceRequest([1, ethers.parseUnits("1000","ether"), 3, 0, 0, [ethers.parseUnits("0.4","ether"), ethers.parseUnits("0.4","ether"), ethers.parseUnits("0.2","ether")]]);
    await investmentParity.connect(owner).rebalanceRequest([2, ethers.parseUnits("234","ether"), 3, 0, 0, [ethers.parseUnits("0.5","ether"), ethers.parseUnits("0.2","ether"), ethers.parseUnits("0.3","ether")]]);
    await managementAlpha.connect(manager).updateTokenPrice(159800000);
    await managementBeta.connect(manager).updateTokenPrice(96700000);
    await managementGamma.connect(manager).updateTokenPrice(81990000); 
    await investmentParity.connect(manager).validateRebalancingRequest([2, 1]);
    console.log("KKdepositRebalancingBalance", await tokenParityStorage.depositRebalancingBalance());


    await managementParity.connect(manager).startNextEvent();
    const depositBalance = await managementParity.depositBalance();
    console.log(depositBalance);
    await managementParity.connect(manager).depositManagerRequest([depositBalance[0], depositBalance[1], depositBalance[2]]);
    await investmentAlpha.connect(manager).startNextEvent();
    await investmentAlpha.connect(manager).validateDeposits([1], depositBalance[0]);
    await investmentBeta.connect(manager).startNextEvent();
    await investmentBeta.connect(manager).validateDeposits([1], depositBalance[1]);
    await investmentGamma.connect(manager).startNextEvent();
    await investmentGamma.connect(manager).validateDeposits([1], depositBalance[2]);
    console.log(await managementParity.validatedCashAmount());
    console.log(await managementParity.depositBalance());
    console.log(await managementParity.totalCashAmount());
    await managementParity.connect(manager).distributeToken(0, [1, 2, 3, 4]);
    await managementParity.connect(manager).distributeToken(1, [1, 2, 3, 4]);
    await managementParity.connect(manager).distributeToken(2, [1, 2, 3, 4]);
  
    console.log(await tokenParityStorage.depositBalancePerToken(1));
    console.log(await tokenParityStorage.depositBalancePerToken(2));
    console.log(await tokenParityStorage.depositBalancePerToken(3));
    console.log(await tokenParityStorage.depositBalancePerToken(4));
  
    console.log(await tokenParityStorage.depositRebalancingBalancePerToken(1));
    console.log(await tokenParityStorage.depositRebalancingBalancePerToken(2));
    console.log(await tokenParityStorage.depositRebalancingBalancePerToken(3));
    console.log(await tokenParityStorage.depositRebalancingBalancePerToken(4));
  
    console.log(await tokenParityStorage.tokenBalancePerToken(1));
    console.log(await tokenParityStorage.tokenBalancePerToken(2));
    console.log(await tokenParityStorage.tokenBalancePerToken(3));
    console.log(await tokenParityStorage.tokenBalancePerToken(4));
  
    console.log(await tokenParityView.getTotalDepositUntilLastEvent(1, 2, 0));
    console.log(await tokenParityView.getTotalDepositUntilLastEvent(1, 2, 1));
    console.log(await tokenParityView.getTotalDepositUntilLastEvent(1, 2, 2));
  
    console.log(await tokenParityView.getTotalDepositUntilLastEvent(2, 2, 0));
    console.log(await tokenParityView.getTotalDepositUntilLastEvent(2, 2, 1));
    console.log(await tokenParityView.getTotalDepositUntilLastEvent(2, 2, 2));
  
  
    console.log(await tokenParityView.getTotalDepositUntilLastEvent(3, 2, 0));
    console.log(await tokenParityView.getTotalDepositUntilLastEvent(3, 2, 1));
    console.log(await tokenParityView.getTotalDepositUntilLastEvent(3, 2, 2));
  
  
    console.log(await tokenParityView.getTotalDepositUntilLastEvent(4, 2, 0));
    console.log(await tokenParityView.getTotalDepositUntilLastEvent(4, 2, 1));
    console.log(await tokenParityView.getTotalDepositUntilLastEvent(4, 2, 2));
  
    //await managementParity.connect(manager).distributeToken(2, [1, 2, 3, 4]);
  }); 

  it("withdraw case  ", async function () {
    const {
      investmentParity,
      tokenParityStorage,
      managementParity,
      safeHouseParity,
      investmentAlpha, 
      investmentBeta,
      investmentGamma,
      stableToken,
      tokenParityView,
      accounts,
      owner,
      admin,
      manager,
      managementAlpha,
      managementBeta,
      managementGamma
    } = await deployeFixture();
   
    await stableToken.mint(owner.address, ethers.parseUnits("1000","ether"));
    await stableToken.connect(owner).approve(investmentParity.target, ethers.parseUnits("1000","ether"));
    await investmentParity.connect(owner).depositRequestWithLowRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
    await investmentParity.connect(owner).depositRequestWithMediumRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
    await investmentParity.connect(owner).depositRequestWithHighRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
    await investmentParity.connect(owner).depositRequest(owner.address, [0,  ethers.parseUnits("1000","ether"), 3, 0, 0, [ethers.parseUnits("0.5","ether"), ethers.parseUnits("0.3","ether"), ethers.parseUnits("0.2","ether")]]);

    await managementAlpha.connect(manager).updateTokenPrice(169800000);
    await managementBeta.connect(manager).updateTokenPrice(126700000);
    await managementGamma.connect(manager).updateTokenPrice(91990000);
    
    await managementParity.connect(manager).startNextEvent();
    const depositBalance = await managementParity.depositBalance();
    await managementParity.connect(manager).depositManagerRequest([depositBalance[0], depositBalance[1], depositBalance[2]]);
    await investmentAlpha.connect(manager).startNextEvent();
    await investmentAlpha.connect(manager).validateDeposits([1], depositBalance[0]);
    await investmentBeta.connect(manager).startNextEvent();
    await investmentBeta.connect(manager).validateDeposits([1], depositBalance[1]);
    await investmentGamma.connect(manager).startNextEvent();
    await investmentGamma.connect(manager).validateDeposits([1], depositBalance[2]);
    console.log(await managementParity.validatedCashAmount());
    console.log(depositBalance);
    console.log(await managementParity.totalCashAmount());
    await managementParity.connect(manager).distributeToken(0, [1, 2, 3, 4]);
    await managementParity.connect(manager).distributeToken(1, [1, 2, 3, 4]);
    await managementParity.connect(manager).distributeToken(2, [1, 2, 3, 4]);
  
  
    await investmentParity.connect(owner).withdrawRequest(1,  ethers.parseUnits("0.5","ether"));
    await investmentParity.connect(owner).withdrawRequest(2,  ethers.parseUnits("0.95","ether"));
    await investmentParity.connect(owner).withdrawRequest(3,  ethers.parseUnits("0.1","ether"));
    await investmentParity.connect(owner).withdrawRequest(4,  ethers.parseUnits("1","ether"));
    await investmentParity.connect(owner).withdrawRequest(3,  ethers.parseUnits("0.4","ether"));
    await investmentParity.connect(owner).withdrawRequest(3,  ethers.parseUnits("0.6","ether"));
    await managementAlpha.connect(manager).updateTokenPrice(131200000);
    await managementBeta.connect(manager).updateTokenPrice(93950000);
    await managementGamma.connect(manager).updateTokenPrice(96870000);
    
    console.log("kkkk", await tokenParityStorage.withdrawalBalancePerToken(3));
    console.log("kkkk", await tokenParityStorage.withdrawalBalancePerToken(1));
    console.log("kkkk", await tokenParityStorage.withdrawalBalancePerToken(2));
    console.log("kkkk", await tokenParityStorage.withdrawalBalancePerToken(4));
    await managementParity.connect(manager).startNextEvent();
    const withdrawalAmount = await managementParity.withdrawalBalance();
    const rebalancingWithdrawalAmount = await managementParity.withdrawalRebalancingBalance();
    console.log("withdrawalAmount", withdrawalAmount);
    console.log("rebalancingWithdrawalAmount", rebalancingWithdrawalAmount);
    await managementParity.connect(manager).withdrawManagerRequest([withdrawalAmount[0], withdrawalAmount[1], withdrawalAmount[2]], [rebalancingWithdrawalAmount[0], rebalancingWithdrawalAmount[1], rebalancingWithdrawalAmount[2]]);
    await investmentAlpha.connect(manager).startNextEvent();
    await investmentAlpha.connect(manager).validateWithdrawals([1], withdrawalAmount[0] + rebalancingWithdrawalAmount[0]);
    await investmentBeta.connect(manager).startNextEvent();
    await investmentBeta.connect(manager).validateWithdrawals([1], withdrawalAmount[1] + rebalancingWithdrawalAmount[1]);
    await investmentGamma.connect(manager).startNextEvent();
    await investmentGamma.connect(manager).validateWithdrawals([1], withdrawalAmount[2] + rebalancingWithdrawalAmount[2]);
  
    console.log(await tokenParityStorage.withdrawalBalancePerToken(1));
    console.log(await tokenParityStorage.withdrawalBalancePerToken(2));
    console.log(await tokenParityStorage.withdrawalBalancePerToken(3));
    console.log(await tokenParityStorage.withdrawalBalancePerToken(4));
  
    console.log(await tokenParityStorage.withdrawalRebalancingBalancePerToken(1));
    console.log(await tokenParityStorage.withdrawalRebalancingBalancePerToken(2));
    console.log(await tokenParityStorage.withdrawalRebalancingBalancePerToken(3));
    console.log(await tokenParityStorage.withdrawalRebalancingBalancePerToken(4));
  
    await managementParity.connect(manager).distributeToken(0, [1, 2, 3, 4]);
    await managementParity.connect(manager).distributeToken(1, [1, 2, 3, 4]);
    await managementParity.connect(manager).distributeToken(2, [1, 2, 3, 4]);
    //console.log(await managementParity.validatedWithdrawalAmount());
    //console.log(await managementParity.validatedRebalancingWithdrawalAmount());
    console.log(await tokenParityStorage.withdrawalBalancePerToken(1));
    console.log(await tokenParityStorage.withdrawalBalancePerToken(2));
    console.log(await tokenParityStorage.withdrawalBalancePerToken(3));
    console.log(await tokenParityStorage.withdrawalBalancePerToken(4));
  
    console.log(await tokenParityStorage.withdrawalRebalancingBalancePerToken(1));
    console.log(await tokenParityStorage.withdrawalRebalancingBalancePerToken(2));
    console.log(await tokenParityStorage.withdrawalRebalancingBalancePerToken(3));
    console.log(await tokenParityStorage.withdrawalRebalancingBalancePerToken(4));
  
    console.log(await tokenParityView.getTotalWithdrawalUntilLastEvent(1, 3, 0));
    console.log(await tokenParityView.getTotalWithdrawalUntilLastEvent(1, 3, 1));
    console.log(await tokenParityView.getTotalWithdrawalUntilLastEvent(1, 3, 2));
  
    console.log(await tokenParityView.getTotalWithdrawalUntilLastEvent(2, 3, 0));
    console.log(await tokenParityView.getTotalWithdrawalUntilLastEvent(2, 3, 1));
    console.log(await tokenParityView.getTotalWithdrawalUntilLastEvent(2, 3, 2));
  
  
    console.log(await tokenParityView.getTotalWithdrawalUntilLastEvent(3, 3, 0));
    console.log(await tokenParityView.getTotalWithdrawalUntilLastEvent(3, 3, 1));
    console.log(await tokenParityView.getTotalWithdrawalUntilLastEvent(3, 3, 2));
  
  
    console.log(await tokenParityView.getTotalWithdrawalUntilLastEvent(4, 3, 0));
    console.log(await tokenParityView.getTotalWithdrawalUntilLastEvent(4, 3, 1));
    console.log(await tokenParityView.getTotalWithdrawalUntilLastEvent(4, 3, 2));
  
  
    
    //await managementParity.connect(manager).distributeToken(2, [1, 2, 3, 4]);
  }); 

  
it("General case with rebalancing  ", async function () {
  const {
    investmentParity,
    tokenParityStorage,
    managementParity,
    safeHouseParity,
    investmentAlpha, 
    investmentBeta,
    investmentGamma,
    stableToken,
    tokenParityView,
    accounts,
    owner,
    admin,
    manager,
    managementAlpha,
    managementBeta,
    managementGamma
  } = await deployeFixture();
 
  await stableToken.mint(owner.address, ethers.parseUnits("1000","ether"));
  await stableToken.connect(owner).approve(investmentParity.target, ethers.parseUnits("1000","ether"));
  await investmentParity.connect(owner).depositRequestWithLowRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithMediumRisk(owner.address, ethers.parseUnits("100","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithHighRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequest(owner.address, [0,  ethers.parseUnits("1000","ether"), 3, 0, 0, [ethers.parseUnits("0.5","ether"), ethers.parseUnits("0.3","ether"), ethers.parseUnits("0.2","ether")]]);
  await managementAlpha.connect(manager).updateTokenPrice(169800000);
    await managementBeta.connect(manager).updateTokenPrice(126700000);
    await managementGamma.connect(manager).updateTokenPrice(91990000);

  await managementParity.connect(manager).startNextEvent();
  const depositBalance = await managementParity.depositBalance();
  await managementParity.connect(manager).depositManagerRequest([depositBalance[0], depositBalance[1], depositBalance[2]]);
  await investmentAlpha.connect(manager).startNextEvent();
  await investmentAlpha.connect(manager).validateDeposits([1], depositBalance[0]);
  await investmentBeta.connect(manager).startNextEvent();
  await investmentBeta.connect(manager).validateDeposits([1], depositBalance[1]);
  await investmentGamma.connect(manager).startNextEvent();
  await investmentGamma.connect(manager).validateDeposits([1], depositBalance[2]);
  console.log(await managementParity.validatedCashAmount());
  console.log(depositBalance);
  console.log(await managementParity.totalCashAmount());
  await managementParity.connect(manager).distributeToken(0, [1, 2, 3, 4]);
  await managementParity.connect(manager).distributeToken(1, [1, 2, 3, 4]);
  await managementParity.connect(manager).distributeToken(2, [1, 2, 3, 4]);
  await time.increase(11000);
  await investmentParity.connect(owner).rebalanceRequest([1,  ethers.parseUnits("1000","ether"), 3, 0, 0, [ethers.parseUnits("0.5","ether"), ethers.parseUnits("0.3","ether"), ethers.parseUnits("0.2","ether")]]);
  console.log("rebalancing fee", await investmentParity.getRebalancingFee(1));
  await investmentParity.connect(owner).rebalanceRequest([1,  ethers.parseUnits("2000","ether"), 3, 0, 0, [ethers.parseUnits("0.3","ether"), ethers.parseUnits("0.4","ether"), ethers.parseUnits("0.3","ether")]]);
  console.log("rebalancing fee", await investmentParity.getRebalancingFee(1));
  await investmentParity.connect(owner).withdrawRequest(2,  ethers.parseUnits("0.5","ether"));
  await investmentParity.connect(owner).cancelWithdrawRequest(2);
  await investmentParity.connect(owner).withdrawRequest(2,  ethers.parseUnits("0.5","ether"));
  console.log("WithdrawalFee", await investmentParity.getWithdrawalFee(2, ethers.parseUnits("0.5","ether")));
  console.log("tokenBalancePerToken_2", await tokenParityStorage.tokenBalancePerToken(2));
  console.log("depositBalancePerToken_2", await tokenParityStorage.depositBalancePerToken(2));
  await investmentParity.connect(owner).withdrawRequest(3,  ethers.parseUnits("0.8","ether"));
  await investmentParity.connect(owner).rebalanceRequest([4, ethers.parseUnits("1000","ether"), 3, 0, 0, [ethers.parseUnits("0.6","ether"), ethers.parseUnits("0.15","ether"), ethers.parseUnits("0.25","ether")]]);
  await investmentParity.connect(owner).withdrawRequest(4,  ethers.parseUnits("1","ether"));
  console.log("tokenBalancePerToken_4_avant_rebalancing", await tokenParityStorage.tokenBalancePerToken(4));
  console.log("depositBalancePerToken_4_avant_rebalancing", await tokenParityStorage.depositBalancePerToken(4));
  console.log("withdrawalBalancePerToken_4_avant_rebalancing", await tokenParityStorage.withdrawalBalancePerToken(4));
  console.log("depositRebalancingBalancePerToken_4_apres_rebalancing", await tokenParityStorage.depositRebalancingBalancePerToken(4));
  console.log("withdrawalRebalancingBalancePerToken_4_apres_rebalancing", await tokenParityStorage.withdrawalRebalancingBalancePerToken(4));
  await investmentParity.connect(owner).rebalanceRequest([4, ethers.parseUnits("1000","ether"), 3, 0, 0, [ethers.parseUnits("0.2","ether"), ethers.parseUnits("0.4","ether"), ethers.parseUnits("0.4","ether")]]);
  await investmentParity.connect(owner).rebalanceRequest([2, 0, 3, 0, 0, [ethers.parseUnits("0.35","ether"), ethers.parseUnits("0.45","ether"), ethers.parseUnits("0.2","ether")]]);
  await investmentParity.connect(owner).rebalanceRequest([3, 0, 3, 0, 0, [ethers.parseUnits("0.2","ether"), ethers.parseUnits("0.4","ether"), ethers.parseUnits("0.4","ether")]]);
  console.log("tokenIdsToRebalance", await tokenParityStorage.tokenIdsToRebalance(2));
  console.log(await tokenParityStorage.getRebalancingRequest(2));
  
  await managementAlpha.connect(manager).updateTokenPrice(160000000);
  await managementBeta.connect(manager).updateTokenPrice(120000000);
  await managementGamma.connect(manager).updateTokenPrice(91000000);
  
  await investmentParity.connect(manager).validateRebalancingRequest([1, 2, 3, 4]);
  await investmentParity.connect(owner).cancelWithdrawRequest(2);
  console.log("tokenBalancePerToken_4_apres_rebalancing", await tokenParityStorage.tokenBalancePerToken(4));
  console.log("depositBalancePerToken_4_apres_rebalancing", await tokenParityStorage.depositBalancePerToken(4));
  console.log("withdrawalBalancePerToken_4_apres_rebalancing", await tokenParityStorage.withdrawalBalancePerToken(4));
  console.log("depositRebalancingBalancePerToken_4_apres_rebalancing", await tokenParityStorage.depositRebalancingBalancePerToken(4));
  console.log("withdrawalRebalancingBalancePerToken_4_apres_rebalancing", await tokenParityStorage.withdrawalRebalancingBalancePerToken(4));
  await investmentParity.connect(owner).depositRequestWithLowRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithMediumRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithHighRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithLowRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithMediumRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithHighRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithLowRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithMediumRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithHighRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithLowRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithMediumRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(owner).depositRequestWithHighRisk(owner.address, ethers.parseUnits("1000","ether"), 0);
  await investmentParity.connect(manager).rebalanceManagerRequest([8, 11, 12]);
  await managementParity.connect(manager).startNextEvent();
  const withdrawalAmount = await managementParity.withdrawalBalance();
  const rebalancingWithdrawalAmount = await managementParity.withdrawalRebalancingBalance();
  const depositBalancenew = await managementParity.depositBalance();
  console.log(withdrawalAmount);
  console.log(rebalancingWithdrawalAmount);
  console.log(depositBalancenew);
  console.log(await stableToken.balanceOf(safeHouseParity.target));

  await managementParity.connect(manager).depositManagerRequest([depositBalancenew[0] , depositBalancenew[1], depositBalancenew[2]]);
 
  await managementParity.connect(manager).withdrawManagerRequest([withdrawalAmount[0], withdrawalAmount[1], withdrawalAmount[2]], [rebalancingWithdrawalAmount[0], rebalancingWithdrawalAmount[1], rebalancingWithdrawalAmount[2]]);

  await investmentAlpha.connect(manager).startNextEvent();
  await investmentAlpha.connect(manager).validateDeposits([2], depositBalancenew[0]);
  await investmentAlpha.connect(manager).validateWithdrawals([1], withdrawalAmount[0] + rebalancingWithdrawalAmount[0]);
  await investmentBeta.connect(manager).startNextEvent();
  await investmentBeta.connect(manager).validateDeposits([2], depositBalancenew[1]);
  await investmentBeta.connect(manager).validateWithdrawals([1], withdrawalAmount[1] + rebalancingWithdrawalAmount[1]);
  await investmentGamma.connect(manager).startNextEvent();
  await investmentGamma.connect(manager).validateDeposits([2], depositBalancenew[2]);
  await investmentGamma.connect(manager).validateWithdrawals([1], withdrawalAmount[2] + rebalancingWithdrawalAmount[2]);

  

//await managementParity.connect(manager).distributeToken(0, [1, 2, 3, 4, 5, 6, 7]);
//await managementParity.connect(manager).distributeToken(1, [1, 2, 3, 4, 5, 6, 7]);
//await managementParity.connect(manager).distributeToken(2, [1, 2, 3, 4, 5, 6, 7]);


 const totalRebalancingTokenAmount =  await  managementParity.totalRebalancingTokenAmount();
  
 const depositRebalancingBalance = await managementParity.depositRebalancingBalance();
 console.log("totalRebalancingTokenAmount", totalRebalancingTokenAmount);
 console.log("depositRebalancingBalance", depositRebalancingBalance);
 console.log("depositRebalancingBalancePerToken(1)", await tokenParityStorage.depositRebalancingBalancePerToken(1));
 console.log("depositRebalancingBalancePerToken(2)", await tokenParityStorage.depositRebalancingBalancePerToken(2));
 console.log("depositRebalancingBalancePerToken(3)", await tokenParityStorage.depositRebalancingBalancePerToken(3));
 
 console.log("withdrawalRebalancingBalancePerToken(1)", await tokenParityStorage.withdrawalRebalancingBalancePerToken(1));
 console.log("withdrawalRebalancingBalancePerToken(2)", await tokenParityStorage.withdrawalRebalancingBalancePerToken(2));
 console.log("withdrawalRebalancingBalancePerToken(3)", await tokenParityStorage.withdrawalRebalancingBalancePerToken(3));
 
 //await  managementParity.connect(manager).withdrawStable(totalRebalancingTokenAmount[0] + totalRebalancingTokenAmount[1] + totalRebalancingTokenAmount[2], safeHouseParity.target, );

 await managementParity.connect(manager).rebalancingDepositManagerRequest([depositRebalancingBalance[0], depositRebalancingBalance[1], depositRebalancingBalance[2]]);
 console.log("totalRebalancingTokenAmount", await managementParity.totalRebalancingTokenAmount());
 console.log("depositRebalancingBalance", await managementParity.depositRebalancingBalance());

 //await investmentAlpha.connect(manager).startNextEvent();
 //await investmentAlpha.connect(manager).validateDeposits([3], totalRebalancingTokenAmount[0]);
 await investmentBeta.connect(manager).startNextEvent();
 await investmentBeta.connect(manager).validateDeposits([3], depositRebalancingBalance[1]);
 await investmentGamma.connect(manager).startNextEvent();
 await investmentGamma.connect(manager).validateDeposits([3], totalRebalancingTokenAmount[0]);

 console.log("totalRebalancingCashAmount", await managementParity.totalRebalancingCashAmount());
 console.log("validatedRebalancingCashAmount", await managementParity.validatedRebalancingCashAmount());
 console.log("totalRebalancingTokenAmount", totalRebalancingTokenAmount);

 
 await managementParity.connect(manager).distributeToken(0, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
 await managementParity.connect(manager).distributeToken(1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
 await managementParity.connect(manager).distributeToken(2, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);



 console.log(await tokenParityStorage.withdrawalBalancePerToken(1));
 console.log(await tokenParityStorage.withdrawalBalancePerToken(2));
 console.log(await tokenParityStorage.withdrawalBalancePerToken(3));
 console.log(await tokenParityStorage.withdrawalBalancePerToken(4));

 console.log(await tokenParityStorage.withdrawalBalancePerToken(5));
 console.log(await tokenParityStorage.withdrawalBalancePerToken(6));
 console.log(await tokenParityStorage.withdrawalBalancePerToken(7));


 console.log(await tokenParityStorage.depositBalancePerToken(1));
 console.log(await tokenParityStorage.depositBalancePerToken(2));
 console.log(await tokenParityStorage.depositBalancePerToken(3));
 console.log(await tokenParityStorage.depositBalancePerToken(4));


 console.log(await tokenParityStorage.depositBalancePerToken(5));
 console.log(await tokenParityStorage.depositBalancePerToken(6));
 console.log(await tokenParityStorage.depositBalancePerToken(7));



 console.log(await tokenParityView.getTotalDepositRebalancingUntilLastEvent(1, 3, 0));
 console.log(await tokenParityView.getTotalDepositRebalancingUntilLastEvent(1, 3, 1));
 console.log(await tokenParityView.getTotalDepositRebalancingUntilLastEvent(1, 3, 2));
 console.log(await managementParity.validatedRebalancingCashAmount());
 console.log(await managementParity.totalRebalancingCashAmount());
 console.log(await managementParity.validatedCashAmount());
 console.log(await managementParity.totalCashAmount());

 console.log("depositRebalancingBalancePerToken(1)", await tokenParityStorage.depositRebalancingBalancePerToken(1));
 console.log("depositRebalancingBalancePerToken(2)", await tokenParityStorage.depositRebalancingBalancePerToken(2));
 console.log("depositRebalancingBalancePerToken(3)", await tokenParityStorage.depositRebalancingBalancePerToken(3));
 
 console.log("withdrawalRebalancingBalancePerToken(1)", await tokenParityStorage.withdrawalRebalancingBalancePerToken(1));
 console.log("withdrawalRebalancingBalancePerToken(2)", await tokenParityStorage.withdrawalRebalancingBalancePerToken(2));
 console.log("withdrawalRebalancingBalancePerToken(3)", await tokenParityStorage.withdrawalRebalancingBalancePerToken(3));

 await investmentParity.connect(owner).withdrawRequest(5,  ethers.parseUnits("0.6","ether"));
 await investmentParity.connect(owner).withdrawRequest(6,  ethers.parseUnits("0.8","ether"));
 await investmentParity.connect(owner).withdrawRequest(5,  ethers.parseUnits("0.2","ether"));
 await investmentParity.connect(owner).withdrawRequest(1,  ethers.parseUnits("1","ether"));
 await investmentParity.connect(owner).withdrawRequest(3,  ethers.parseUnits("0.01","ether"));
 await investmentParity.connect(owner).withdrawRequest(10,  ethers.parseUnits("0.9","ether"));
 await investmentParity.connect(owner).withdrawRequest(10,  ethers.parseUnits("1","ether"));
 
}); 
}); 
  



}); 

  
