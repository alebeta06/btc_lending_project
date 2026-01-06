"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { notification } from "~~/utils/scaffold-stark";

/**
 * BorrowForm Component
 * 
 * Allows users to borrow stablecoins against their wBTC collateral.
 * 
 * Requirements:
 * - User must have deposited collateral
 * - Borrow amount must maintain Health Factor > 1.0
 * - Maximum borrow = (Collateral Value * Liquidation Threshold) - Current Debt
 */
export function BorrowForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  // Get user's collateral
  const { data: collateral } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "get_user_collateral",
    args: address ? [address] : undefined,
  });

  // Get user's current debt
  const { data: debt } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "get_user_debt",
    args: address ? [address] : undefined,
  });

  // Get health factor
  const { data: healthFactor } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "calculate_health_factor",
    args: address ? [address] : undefined,
  });

  // Get BTC price from oracle
  const { data: oraclePrice } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "get_btc_price",
    args: [],
  });

  const { sendAsync: borrow } = useScaffoldWriteContract({
    contractName: "BTCLending",
    functionName: "borrow",
  });

  const handleBorrow = async () => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      notification.error("Please enter a valid amount");
      return;
    }

    const collateralValue = collateral ? Number(collateral) / 100000000 : 0;
    if (collateralValue === 0) {
      notification.error("You must deposit collateral first");
      return;
    }

    try {
      // Convert amount to BigInt (8 decimals for USD debt - MUST match contract!)
      const amountFloat = parseFloat(amount);
      const amountBigInt = BigInt(Math.floor(amountFloat * 100000000)); // 8 decimals

      console.log("=== Borrow Debug Info ===");
      console.log("Amount (USD):", amountFloat);
      console.log("Amount (BigInt with 8 decimals):", amountBigInt.toString());
      console.log("Collateral (wBTC):", collateralValue);
      console.log("Current Debt (USD):", debtValue);
      console.log("Max Borrow (USD):", maxBorrow);
      console.log("========================");

      // Validate amount doesn't exceed max borrow
      if (amountFloat > maxBorrow) {
        notification.error(`Amount exceeds max borrow of $${maxBorrow.toFixed(2)}`);
        return;
      }

      notification.info("Borrowing...");
      await borrow({
        args: [amountBigInt],
      });

      notification.success(`✅ Successfully borrowed $${amount}!`);
      setAmount("");
    } catch (error: any) {
      console.error("=== Borrow Error ===");
      console.error("Full error:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("===================");
      
      // More specific error messages
      let errorMsg = "Unknown error";
      if (error.message) {
        if (error.message.includes("InsufficientCollateral")) {
          errorMsg = "Insufficient collateral for this borrow amount";
        } else if (error.message.includes("health")) {
          errorMsg = "This borrow would make your Health Factor too low";
        } else {
          errorMsg = error.message;
        }
      }
      
      notification.error(`Failed: ${errorMsg}`);
    }
  };

  const collateralValue = collateral ? Number(collateral) / 100000000 : 0;
  const debtValue = debt ? Number(debt) / 100000000 : 0; // 8 decimals for USD
  const hfValue = healthFactor ? Number(healthFactor) / 100 : 0; // Health Factor scaled by 100

  // Get BTC price from oracle (with 8 decimals)
  const btcPrice = oraclePrice ? Number(oraclePrice) / 100000000 : 0;
  
  // Calculate max borrow (80% LTV)
  const maxBorrow = Math.max(0, (collateralValue * btcPrice * 0.8) - debtValue);

  // Botones rápidos para pedir prestado
  const quickBorrowButtons = [
    { label: "25%", value: (maxBorrow * 0.25).toFixed(2) },
    { label: "50%", value: (maxBorrow * 0.5).toFixed(2) },
    { label: "75%", value: (maxBorrow * 0.75).toFixed(2) },
    { label: "Max", value: maxBorrow.toFixed(2) },
  ];

  return (
    <div className="card bg-base-100 shadow-xl p-6">
      <h2 className="card-title text-xl mb-4">💸 Borrow</h2>

      {!address ? (
        <p className="text-center opacity-70">Connect your wallet to borrow</p>
      ) : collateralValue === 0 ? (
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>You need to deposit collateral first!</span>
        </div>
      ) : (
        <>
          <div className="stats stats-vertical shadow mb-4 bg-base-200">
            <div className="stat">
              <div className="stat-title opacity-70 text-xs">Your Collateral</div>
              <div className="stat-value text-xl font-bold">{collateralValue.toFixed(8)} wBTC</div>
              <div className="stat-desc opacity-60 text-xs">≈ ${(collateralValue * btcPrice).toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="stat-title opacity-70 text-xs">Current Debt</div>
              <div className="stat-value text-xl font-bold">${debtValue.toFixed(2)}</div>
              <div className="stat-desc opacity-60 text-xs">Health Factor: {hfValue === 0 ? "∞" : hfValue.toFixed(2)}</div>
            </div>
            <div className="stat">
              <div className="stat-title opacity-70 text-xs">Max Borrow</div>
              <div className="stat-value text-xl font-bold text-success">${maxBorrow.toFixed(2)}</div>
              <div className="stat-desc opacity-60 text-xs">80% LTV</div>
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-xs">Amount (USD)</span>
            </label>
            <div className="text-xs opacity-60 mb-1 text-right">
              Max: ${maxBorrow.toFixed(2)}
            </div>
            <input
              type="number"
              placeholder="0.00"
              className="input input-bordered w-full input-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              max={maxBorrow}
            />
          </div>

          {/* Quick Borrow Buttons */}
          <div className="mt-3">
            <label className="label">
              <span className="label-text text-xs opacity-70">Quick Borrow:</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {quickBorrowButtons.map((preset) => (
                <button
                  key={preset.label}
                  className="btn btn-xs btn-outline"
                  onClick={() => setAmount(preset.value)}
                  disabled={parseFloat(preset.value) === 0}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card-actions justify-end mt-3">
            <button
              className="btn btn-primary w-full btn-sm"
              onClick={handleBorrow}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxBorrow}
            >
              💸 Borrow ${amount || "0.00"}
            </button>
          </div>

          <div className="alert alert-info mt-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div className="text-xs">
              <p><strong>⚠️ Keep HF &gt; 1.0</strong></p>
              <p>Avoid liquidation</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
