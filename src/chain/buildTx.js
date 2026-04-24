// ============================================================
// Client-side Solana transaction constructors.
//
// All SOL payments are ATOMIC 3-WAY SPLITS. A single transaction
// contains three SystemProgram.transfer instructions — ops / buyback
// / prize — so the split is enforced cryptographically at payment time.
// No wallet ever holds the combined amount.
// ============================================================
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createBurnCheckedInstruction,
} from '@solana/spl-token';

const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
export const BIRD_MINT = new PublicKey(import.meta.env.VITE_BIRD_MINT || '11111111111111111111111111111111');

export const OPS_MULTISIG = new PublicKey(import.meta.env.VITE_OPS_MULTISIG || '11111111111111111111111111111111');
export const BUYBACK_WALLET = new PublicKey(import.meta.env.VITE_BUYBACK_WALLET || '11111111111111111111111111111111');
export const PRIZE_WALLET = new PublicKey(import.meta.env.VITE_PRIZE_WALLET || '11111111111111111111111111111111');

const SPLIT_OPS_BPS = parseInt(import.meta.env.VITE_SPLIT_OPS_BPS || '2000', 10);
const SPLIT_BUYBACK_BPS = parseInt(import.meta.env.VITE_SPLIT_BUYBACK_BPS || '5000', 10);
const SPLIT_PRIZE_BPS = parseInt(import.meta.env.VITE_SPLIT_PRIZE_BPS || '3000', 10);

if (SPLIT_OPS_BPS + SPLIT_BUYBACK_BPS + SPLIT_PRIZE_BPS !== 10000) {
  console.warn(
    `[buildTx] SPLIT_*_BPS must sum to 10000 (got ${SPLIT_OPS_BPS + SPLIT_BUYBACK_BPS + SPLIT_PRIZE_BPS})`,
  );
}

const BIRD_DECIMALS = parseInt(import.meta.env.VITE_BIRD_DECIMALS || '6', 10);
const connection = new Connection(RPC_URL, 'confirmed');
export { connection };

const LAMPORTS_PER_SOL = 1_000_000_000n;
function solToLamportsBig(sol) {
  return BigInt(Math.round(sol * Number(LAMPORTS_PER_SOL)));
}

// Atomic 3-way split math. Rounding lamports absorbed by the prize slice
// so the sum exactly equals the gross (server verifier expects exact match).
function splitLamports(gross) {
  const ops = (gross * BigInt(SPLIT_OPS_BPS)) / 10000n;
  const buyback = (gross * BigInt(SPLIT_BUYBACK_BPS)) / 10000n;
  const prize = gross - ops - buyback;
  return { ops, buyback, prize };
}

// ----- Atomic split payment (play fee / revive SOL / powerup SOL) -----
export async function buildSplitPayment(fromAddress, grossSol) {
  const from = new PublicKey(fromAddress);
  const gross = solToLamportsBig(grossSol);
  const { ops, buyback, prize } = splitLamports(gross);

  const tx = new Transaction();
  tx.add(
    SystemProgram.transfer({ fromPubkey: from, toPubkey: OPS_MULTISIG, lamports: Number(ops) }),
    SystemProgram.transfer({ fromPubkey: from, toPubkey: BUYBACK_WALLET, lamports: Number(buyback) }),
    SystemProgram.transfer({ fromPubkey: from, toPubkey: PRIZE_WALLET, lamports: Number(prize) }),
  );

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = from;
  return tx;
}

// ----- $BIRD burn (revive with $BIRD / powerup with $BIRD) -----
// $BIRD payments stay single-instruction: the user burns their tokens
// from their own associated token account. Supply reduction is the point.
export async function buildBirdBurn(fromAddress, amountWhole) {
  const from = new PublicKey(fromAddress);
  const ata = getAssociatedTokenAddressSync(BIRD_MINT, from);
  const amountRaw = BigInt(amountWhole) * BigInt(10) ** BigInt(BIRD_DECIMALS);

  const tx = new Transaction().add(
    createBurnCheckedInstruction(ata, BIRD_MINT, from, amountRaw, BIRD_DECIMALS),
  );
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = from;
  return tx;
}
