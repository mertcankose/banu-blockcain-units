// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract P2PLending is ReentrancyGuard, Ownable {
    IERC20 public uusdt;
    uint256 public unit0Rate; // 1 UNIT0 = kaç UUSDT (18 decimals)
    
    struct LendingOffer {
        address lender;          // Borç veren
        uint256 uusdtAmount;     // UUSDT miktarı
        uint256 collateralRate;  // Teminat oranı (100 = %100)
        uint256 interestRate;    // Faiz oranı (1000 = %10)
        uint256 duration;        // Dakika cinsinden süre
        bool isActive;           // Teklif aktif mi?
    }

    struct Loan {
        address lender;          // Borç veren
        address borrower;        // Borç alan
        uint256 uusdtAmount;     // UUSDT miktarı
        uint256 unit0Amount;     // UNIT0 teminat miktarı
        uint256 collateralRate;  // Teminat oranı
        uint256 interestRate;    // Faiz oranı
        uint256 startTime;       // Başlangıç zamanı
        uint256 duration;        // Süre
        bool isActive;           // Kredi aktif mi?
    }

    uint256 public offerCount;
    uint256 public loanCount;

    mapping(uint256 => LendingOffer) public lendingOffers;
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public userLoans;

    event RateUpdated(uint256 newRate);
    event OfferCreated(uint256 indexed offerId, address lender, uint256 uusdtAmount, uint256 requiredUNIT0);
    event LoanCreated(uint256 indexed loanId, address borrower, address lender, uint256 unit0Amount);
    event LoanRepaid(uint256 indexed loanId, uint256 repayAmount);
    event CollateralClaimed(uint256 indexed loanId, uint256 unit0Amount);
    event EmergencyWithdraw(address token, uint256 amount);

    constructor(address _uusdt, uint256 _initialRate) Ownable(msg.sender) {
        uusdt = IERC20(_uusdt);
        unit0Rate = _initialRate;
    }

    // UNIT0/UUSDT oranını güncelle
    function setUNIT0Rate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Invalid rate");
        unit0Rate = newRate;
        emit RateUpdated(newRate);
    }

    // Gerekli UNIT0 teminat miktarını hesapla
    function calculateRequiredUNIT0(uint256 uusdtAmount, uint256 collateralRate) public view returns (uint256) {
        return (uusdtAmount * collateralRate * 1e18) / (unit0Rate * 100);
    }

    // UNIT0 miktarının UUSDT değerini hesapla
    function calculateUUSDTValue(uint256 unit0Amount) public view returns (uint256) {
        return (unit0Amount * unit0Rate) / 1e18;
    }

    // Borç verme teklifi oluştur
    function createOffer(
        uint256 _uusdtAmount,
        uint256 _collateralRate,
        uint256 _interestRate,
        uint256 _duration
    ) external nonReentrant {
        require(_uusdtAmount > 0, "Amount must be > 0");
        require(_collateralRate >= 100, "Collateral rate must be >= 100%");
        require(_interestRate > 0 && _interestRate <= 5000, "Invalid interest rate"); // max 50%
        require(_duration > 0 && _duration <= 525600, "Invalid duration"); // max 1 year in minutes (365 * 24 * 60)

        uusdt.transferFrom(msg.sender, address(this), _uusdtAmount);

        offerCount++;
        lendingOffers[offerCount] = LendingOffer({
            lender: msg.sender,
            uusdtAmount: _uusdtAmount,
            collateralRate: _collateralRate,
            interestRate: _interestRate,
            duration: _duration,
            isActive: true
        });

        uint256 requiredUNIT0 = calculateRequiredUNIT0(_uusdtAmount, _collateralRate);
        emit OfferCreated(offerCount, msg.sender, _uusdtAmount, requiredUNIT0);
    }

    // Borç al
    function borrowFromOffer(uint256 _offerId) external payable nonReentrant {
        LendingOffer storage offer = lendingOffers[_offerId];
        require(offer.isActive, "Offer not active");

        uint256 requiredUNIT0 = calculateRequiredUNIT0(offer.uusdtAmount, offer.collateralRate);
        require(msg.value >= requiredUNIT0, "Insufficient collateral");

        loanCount++;
        loans[loanCount] = Loan({
            lender: offer.lender,
            borrower: msg.sender,
            uusdtAmount: offer.uusdtAmount,
            unit0Amount: msg.value,
            collateralRate: offer.collateralRate,
            interestRate: offer.interestRate,
            startTime: block.timestamp,
            duration: offer.duration,
            isActive: true
        });

        userLoans[msg.sender].push(loanCount);
        
        uusdt.transfer(msg.sender, offer.uusdtAmount);
        offer.isActive = false;

        emit LoanCreated(loanCount, msg.sender, offer.lender, msg.value);
    }

    // Borç geri öde
    function repayLoan(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.isActive, "Loan not active");
        require(msg.sender == loan.borrower, "Not the borrower");
        require(
            block.timestamp <= loan.startTime + (loan.duration * 1 minutes),
            "Loan expired"
        );

        uint256 interest = (loan.uusdtAmount * loan.interestRate) / 1000;
        uint256 totalRepayment = loan.uusdtAmount + interest;

        uusdt.transferFrom(msg.sender, loan.lender, totalRepayment);
        
        (bool sent, ) = loan.borrower.call{value: loan.unit0Amount}("");
        require(sent, "Failed to return collateral");

        loan.isActive = false;
        emit LoanRepaid(_loanId, totalRepayment);
    }

    // Teminatı talep et
    function claimCollateral(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.isActive, "Loan not active");
        require(msg.sender == loan.lender, "Not the lender");
        require(
            block.timestamp > loan.startTime + (loan.duration * 1 minutes),
            "Loan not expired"
        );

        (bool sent, ) = loan.lender.call{value: loan.unit0Amount}("");
        require(sent, "Failed to transfer collateral");

        loan.isActive = false;
        emit CollateralClaimed(_loanId, loan.unit0Amount);
    }

    function getActiveOffers() external view returns (LendingOffer[] memory) {
        // Önce aktif teklif sayısını bul
        uint256 activeCount = 0;
        for(uint256 i = 1; i <= offerCount; i++) {
            if(lendingOffers[i].isActive) {
                activeCount++;
            }
        }
    
        // Aktif teklifleri içerecek array oluştur
        LendingOffer[] memory activeOffers = new LendingOffer[](activeCount);
        uint256 currentIndex = 0;
        
        // Aktif teklifleri doldur
        for(uint256 i = 1; i <= offerCount; i++) {
            if(lendingOffers[i].isActive) {
                activeOffers[currentIndex] = lendingOffers[i];
                currentIndex++;
            }
        }
        
        return activeOffers;
    }

    function getUserLoans(address _user) external view returns (uint256[] memory) {
        return userLoans[_user];
    }

    function getTestValues(uint256 _uusdtAmount, uint256 _collateralRate) external view returns (
        uint256 requiredUNIT0,
        uint256 uusdtValue
    ) {
        uint256 unit0Amount = calculateRequiredUNIT0(_uusdtAmount, _collateralRate);
        return (
            unit0Amount,
            calculateUUSDTValue(unit0Amount)
        );
    }

    // Emergency Functions
    function emergencyWithdrawUNIT0() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No UNIT0 to withdraw");
        
        (bool sent, ) = owner().call{value: balance}("");
        require(sent, "Failed to withdraw UNIT0");
        
        emit EmergencyWithdraw(address(0), balance);
    }

    function emergencyWithdrawUUSDT() external onlyOwner {
        uint256 balance = uusdt.balanceOf(address(this));
        require(balance > 0, "No UUSDT to withdraw");
        
        require(uusdt.transfer(owner(), balance), "Failed to withdraw UUSDT");
        emit EmergencyWithdraw(address(uusdt), balance);
    }

    fallback() external payable {}
    receive() external payable {}
}
