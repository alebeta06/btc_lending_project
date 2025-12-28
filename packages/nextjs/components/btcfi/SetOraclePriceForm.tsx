"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { notification } from "~~/utils/scaffold-stark";

/**
 * SetOraclePriceForm Component
 * 
 * Allows updating the BTC price in the oracle (for testing).
 * In production, this would be done by a Chainlink oracle or similar.
 */
export function SetOraclePriceForm() {
  const { address } = useAccount();
  const [price, setPrice] = useState("100000");

  const { sendAsync: setOraclePrice } = useScaffoldWriteContract({
    contractName: "BTCLending",
    functionName: "set_oracle_price",
    args: [0n], // Placeholder, will be overridden in sendAsync call
  });

  const handleSetPrice = async () => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      notification.error("Please enter a valid price");
      return;
    }

    try {
      // Convert price to BigInt (13 decimals for USD price)
      const priceBigInt = BigInt(Math.floor(parseFloat(price) * 10000000000000));

      console.log("Setting oracle price to:", price);
      console.log("Price (BigInt):", priceBigInt.toString());

      notification.info("Updating oracle price...");
      await setOraclePrice({
        args: [priceBigInt],
      });

      notification.success(`✅ Oracle price updated to $${parseFloat(price).toLocaleString()}!`);
    } catch (error: any) {
      console.error("Set price error:", error);
      notification.error(`Failed: ${error.message || "Unknown error"}`);
    }
  };

  // Quick price buttons
  const quickPrices = [
    { label: "$60,000", value: "60000" },
    { label: "$80,000", value: "80000" },
    { label: "$100,000", value: "100000" },
    { label: "$120,000", value: "120000" },
  ];

  return (
    <div className="card bg-warning/10 shadow-xl p-6 border-2 border-warning/30">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="card-title text-xl">⚙️ Set Oracle Price</h2>
        <div className="badge badge-warning">Admin Only</div>
      </div>

      {!address ? (
        <p className="text-center opacity-70">Connect your wallet to update oracle price</p>
      ) : (
        <>
          <div className="alert alert-warning mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs">
              <p><strong>⚠️ Important:</strong> The oracle price is currently set to <strong>$60,000</strong></p>
              <p>Update it to $100,000 to match the UI calculations!</p>
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">BTC Price (USD)</span>
            </label>
            <input
              type="number"
              placeholder="100000"
              className="input input-bordered w-full"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="1000"
              min="0"
            />
          </div>

          {/* Quick Price Buttons */}
          <div className="mt-4">
            <label className="label">
              <span className="label-text text-sm opacity-70">Quick Set:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {quickPrices.map((preset) => (
                <button
                  key={preset.value}
                  className="btn btn-sm btn-outline"
                  onClick={() => setPrice(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card-actions justify-end mt-4">
            <button
              className="btn btn-warning w-full"
              onClick={handleSetPrice}
              disabled={!price || parseFloat(price) <= 0}
            >
              ⚙️ Update Oracle Price
            </button>
          </div>

          <div className="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div className="text-xs">
              <p><strong>Note:</strong> In production, oracle prices come from Chainlink or Pragma.</p>
              <p>This function is only for testing purposes.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
