import { NextResponse } from "next/server";
import { fetchStatus } from "@/features/near-intents/services/oneclick-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const depositAddress = searchParams.get("depositAddress");
  const depositMemo = searchParams.get("depositMemo") ?? undefined;

  if (!depositAddress) {
    return NextResponse.json(
      { error: "depositAddress is required" },
      { status: 400 }
    );
  }

  try {
    const status = await fetchStatus(depositAddress, depositMemo);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status failed" },
      { status: 502 }
    );
  }
}
