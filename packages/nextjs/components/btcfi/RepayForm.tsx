"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { notification } from "~~/utils/scaffold-stark";

/**
 * RepayForm Component
 * 
 * Permite a los usuarios pagar su deuda (total o parcialmente).
 * El pago se hace con wBTC, por lo que necesitan:
 * 1. Tener wBTC en su wallet
 * 2. Aprobar el gasto de wBTC
 * 3. Ejecutar repay()
 */
export function RepayForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  // Leer deuda actual del usuario
  const { data: debt } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "get_user_debt",
    args: address ? [address] : undefined,
  });

  // Leer balance de wBTC del usuario
  const { data: wbtcBalance } = useScaffoldReadContract({
    contractName: "MockWBTC",
    functionName: "balance_of",
    args: address ? [address] : undefined,
  });

  const { sendAsync: approve } = useScaffoldWriteContract({
    contractName: "MockWBTC",
    functionName: "approve",
    args: [0n, 0n], // Placeholder
  });

  const { sendAsync: repay } = useScaffoldWriteContract({
    contractName: "BTCLending",
    functionName: "repay",
    args: [0n], // Placeholder
  });

  const handleRepay = async () => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      notification.error("Please enter a valid amount");
      return;
    }

    const debtValue = debt ? Number(debt) / 10000000000000 : 0; // 13 decimals
    const amountFloat = parseFloat(amount);

    if (amountFloat > debtValue) {
      notification.error(`Amount exceeds your debt of $${debtValue.toFixed(2)}`);
      return;
    }

    try {
      // Convert amount to BigInt (13 decimals for USD)
      const amountBigInt = BigInt(Math.floor(amountFloat * 10000000000000));

      console.log("=== Repay Debug Info ===");
      console.log("Amount (USD):", amountFloat);
      console.log("Amount (BigInt):", amountBigInt.toString());
      console.log("Current Debt (USD):", debtValue);
      console.log("========================");

      // Repay (no approve needed - just reduces debt)
      notification.info("Repaying debt...");
      await repay({
        args: [amountBigInt],
      });

      notification.success(`✅ Successfully repaid $${amount}!`);
      setAmount("");
    } catch (error: any) {
      console.error("=== Repay Error ===");
      console.error("Full error:", error);
      console.error("===================");
      
      let errorMsg = "Unknown error";
      if (error.message) {
        if (error.message.includes("Amount exceeds debt")) {
          errorMsg = "Amount exceeds your current debt";
        } else if (error.message.includes("Amount must be positive")) {
          errorMsg = "Amount must be greater than 0";
        } else {
          errorMsg = error.message;
        }
      }
      
      notification.error(`Failed: ${errorMsg}`);
    }
  };

  const debtValue = debt ? Number(debt) / 10000000000000 : 0;

  // Botones rápidos para pagar porcentajes de la deuda
  const quickRepayButtons = [
    { label: "25%", value: (debtValue * 0.25).toFixed(2) },
    { label: "50%", value: (debtValue * 0.5).toFixed(2) },
    { label: "75%", value: (debtValue * 0.75).toFixed(2) },
    { label: "100%", value: debtValue.toFixed(2) },
  ];

  return (
    <div className="card bg-base-100 shadow-xl p-6">
      <h2 className="card-title text-xl mb-4">💵 Repay Debt</h2>

      {!address ? (
        <p className="text-center opacity-70">Connect your wallet to repay debt</p>
      ) : debtValue === 0 ? (
        <div className="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p><strong>No Debt!</strong></p>
            <p className="text-xs">You don&apos;t have any debt to repay.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="stats stats-vertical shadow mb-4 bg-base-200">
            <div className="stat">
              <div className="stat-title opacity-70 text-xs">Current Debt</div>
              <div className="stat-value text-xl font-bold text-error">${debtValue.toFixed(2)}</div>
              <div className="stat-desc opacity-60 text-xs">USD owed</div>
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-xs">Amount (USD)</span>
            </label>
            <div className="text-xs opacity-60 mb-1 text-right">
              Max: ${debtValue.toFixed(2)}
            </div>
            <input
              type="number"
              placeholder="0.00"
              className="input input-bordered w-full input-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              max={debtValue}
            />
          </div>

          {/* Quick Repay Buttons */}
          <div className="mt-3">
            <label className="label">
              <span className="label-text text-xs opacity-70">Quick Repay:</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {quickRepayButtons.map((preset) => (
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
              className="btn btn-success w-full btn-sm"
              onClick={handleRepay}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > debtValue}
            >
              💵 Repay ${amount || "0.00"}
            </button>
          </div>

          <div className="alert alert-info mt-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div className="text-xs">
              <p><strong>Note:</strong> Simplified repay</p>
              <p>Just reduces your debt (no token transfer)</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
