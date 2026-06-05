import { NextResponse } from "next/server";
import { requestQuote } from "@/features/near-intents/services/oneclick-server";
import type { QuoteRequestParams } from "@/features/near-intents/types";

export async function POST(request: Request) {
  let params: QuoteRequestParams;
  try {
    params = (await request.json()) as QuoteRequestParams;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !params.originAsset ||
    !params.destinationAsset ||
    !params.amount ||
    !params.recipient ||
    !params.refundTo
  ) {
    return NextResponse.json(
      {
        error:
          "originAsset, destinationAsset, amount, recipient and refundTo are required",
      },
      { status: 400 }
    );
  }

  try {
    const quote = await requestQuote(params);
    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Quote failed" },
      { status: 502 }
    );
  }
}
