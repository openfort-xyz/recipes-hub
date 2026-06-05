import { NextResponse } from "next/server";
import { fetchTokens } from "@/features/near-intents/services/oneclick-server";

export async function GET() {
  try {
    const tokens = await fetchTokens();
    return NextResponse.json(tokens);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load tokens",
      },
      { status: 502 }
    );
  }
}
