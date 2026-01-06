"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { notification } from "~~/utils/scaffold-stark";

/**
 * WithdrawForm Component
 * 
 * Permite a los usuarios retirar su colateral (wBTC).
 * Si el usuario tiene deuda, el retiro está limitado para mantener
 * el Health Factor >= 1.0 y evitar liquidación.
 */
export function WithdrawForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  // Leer colateral del usuario
  const { data: collateral } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "get_user_collateral",
    args: address ? [address] : undefined,
  });

  // Leer deuda del usuario
  const { data: debt } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "get_user_debt",
    args: address ? [address] : undefined,
  });

  // Leer Health Factor
  const { data: healthFactor } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "calculate_health_factor",
    args: [address],
  });

  // Leer precio de BTC desde el oracle
  const { data: btcPriceData } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "get_oracle_price",
    args: [],
  });

  const { sendAsync: withdraw } = useScaffoldWriteContract({
    contractName: "BTCLending",
    functionName: "withdraw_collateral",
    args: [0n], // Placeholder
  });

  const handleWithdraw = async () => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      notification.error("Please enter a valid amount");
      return;
    }

    const collateralValue = collateral ? Number(collateral) / 100000000 : 0;
    const amountFloat = parseFloat(amount);

    if (amountFloat > collateralValue) {
      notification.error(`Amount exceeds your collateral of ${collateralValue.toFixed(8)} wBTC`);
      return;
    }

    if (amountFloat > maxWithdraw) {
      notification.error(`Amount exceeds max withdrawable of ${maxWithdraw.toFixed(8)} wBTC`);
      return;
    }

    try {
      // Convert amount to BigInt (8 decimals for wBTC)
      const amountBigInt = BigInt(Math.floor(amountFloat * 100000000));

      console.log("=== Withdraw Debug Info ===");
      console.log("Amount (wBTC):", amountFloat);
      console.log("Amount (BigInt):", amountBigInt.toString());
      console.log("Current Collateral:", collateralValue);
      console.log("Max Withdraw:", maxWithdraw);
      console.log("===========================");

      notification.info("Withdrawing collateral...");
      await withdraw({
        args: [amountBigInt],
      });

      notification.success(`✅ Successfully withdrew ${amount} wBTC!`);
      setAmount("");
    } catch (error: any) {
      console.error("=== Withdraw Error ===");
      console.error("Full error:", error);
      console.error("======================");
      
      let errorMsg = "Unknown error";
      if (error.message) {
        if (error.message.includes("Health factor too low")) {
          errorMsg = "This withdrawal would make your Health Factor too low";
        } else if (error.message.includes("Insufficient collateral")) {
          errorMsg = "Insufficient collateral";
        } else if (error.message.includes("Amount must be positive")) {
          errorMsg = "Amount must be greater than 0";
        } else {
          errorMsg = error.message;
        }
      }
      
      notification.error(`Failed: ${errorMsg}`);
    }
  };

  const collateralValue = collateral ? Number(collateral) / 100000000 : 0;
  const debtValue = debt ? Number(debt) / 10000000000000 : 0;
  const hfValue = healthFactor ? Number(healthFactor) / 100 : 0;

  // Calcular máximo retirable
  let maxWithdraw = 0;
  if (debtValue === 0) {
    // Sin deuda, puede retirar todo
    maxWithdraw = collateralValue;
  } else {
    // Con deuda, calcular cuánto puede retirar sin bajar HF < 1.0
    // HF = (Collateral * Price * 0.8) / Debt >= 1.0
    // Collateral_min = Debt / (Price * 0.8)
    // Max_Withdraw = Collateral - Collateral_min
    
    // Leer precio del oracle (fallback a 100,000 si no está disponible)
    const btcPrice = btcPriceData ? Number(btcPriceData) / 10000000000000 : 100000;
    
    const minCollateralUSD = debtValue / 0.8;
    const minCollateralBTC = minCollateralUSD / btcPrice;
    maxWithdraw = Math.max(0, collateralValue - minCollateralBTC);
  }

  // Botones rápidos
  const quickWithdrawButtons = [
    { label: "25%", value: (maxWithdraw * 0.25).toFixed(8) },
    { label: "50%", value: (maxWithdraw * 0.5).toFixed(8) },
    { label: "75%", value: (maxWithdraw * 0.75).toFixed(8) },
    { label: "Max", value: maxWithdraw.toFixed(8) },
  ];

  return (
    <div className="card bg-base-100 shadow-xl p-6">
      <h2 className="card-title text-xl mb-4">🏦 Withdraw Collateral</h2>

      {!address ? (
        <p className="text-center opacity-70">Connect your wallet to withdraw collateral</p>
      ) : collateralValue === 0 ? (
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p><strong>No Collateral!</strong></p>
            <p>You don&apos;t have any collateral deposited.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="stats stats-vertical shadow mb-4 bg-base-200">
            <div className="stat">
              <div className="stat-title opacity-70 text-xs">Your Collateral</div>
              <div className="stat-value text-xl font-bold">{collateralValue.toFixed(8)}</div>
              <div className="stat-desc opacity-60 text-xs">wBTC deposited</div>
            </div>
            <div className="stat">
              <div className="stat-title opacity-70 text-xs">Max Withdrawable</div>
              <div className="stat-value text-xl font-bold text-success">{maxWithdraw.toFixed(8)}</div>
              <div className="stat-desc opacity-60 text-xs">
                {debtValue > 0 ? "Without lowering HF &lt; 1.0" : "No debt restrictions"}
              </div>
            </div>
            {debtValue > 0 && (
              <div className="stat">
                <div className="stat-title opacity-70 text-xs">Current Health Factor</div>
                <div className={`stat-value text-xl font-bold ${hfValue < 1.5 ? "text-warning" : "text-success"}`}>
                  {hfValue.toFixed(2)}
                </div>
                <div className="stat-desc opacity-60 text-xs">Must stay &gt;= 1.0</div>
              </div>
            )}
          </div>

          {debtValue > 0 && maxWithdraw === 0 && (
            <div className="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p><strong>Cannot Withdraw!</strong></p>
                <p>Your Health Factor is too low. Repay debt first.</p>
              </div>
            </div>
          )}

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-xs">Amount (wBTC)</span>
            </label>
            <div className="text-xs opacity-60 mb-1 text-right">
              Max: {maxWithdraw.toFixed(8)} wBTC
            </div>
            <input
              type="number"
              placeholder="0.00000000"
              className="input input-bordered w-full input-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.00000001"
              min="0"
              max={maxWithdraw}
              disabled={maxWithdraw === 0}
            />
          </div>

          {/* Quick Withdraw Buttons */}
          <div className="mt-3">
            <label className="label">
              <span className="label-text text-xs opacity-70">Quick Withdraw:</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {quickWithdrawButtons.map((preset) => (
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
              onClick={handleWithdraw}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxWithdraw || maxWithdraw === 0}
            >
              🏦 Withdraw {amount || "0"} wBTC
            </button>
          </div>

          {debtValue > 0 && (
            <div className="alert alert-warning mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-xs">
                <p><strong>⚠️ You have active debt:</strong> ${debtValue.toFixed(2)}</p>
                <p>Withdrawing too much will lower your Health Factor and risk liquidation.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
