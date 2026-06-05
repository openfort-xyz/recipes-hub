import { NextResponse } from "next/server";
import { submitDeposit } from "@/features/near-intents/services/oneclick-server";

interface DepositBody {
  txHash?: string;
  depositAddress?: string;
  memo?: string;
}

export async function POST(request: Request) {
  let body: DepositBody;
  try {
    body = (await request.json()) as DepositBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.txHash || !body.depositAddress) {
    return NextResponse.json(
      { error: "txHash and depositAddress are required" },
      { status: 400 }
    );
  }

  try {
    await submitDeposit({
      txHash: body.txHash,
      depositAddress: body.depositAddress,
      memo: body.memo,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Deposit submit failed",
      },
      { status: 502 }
    );
  }
}
