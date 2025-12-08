import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Parse the incoming form data from the browser
    const formData = await req.formData();
    const oldPolicy = formData.get("oldPolicy") as File | null;
    const newPolicy = formData.get("newPolicy") as File | null;

    if (!oldPolicy || !newPolicy) {
      return NextResponse.json(
        { error: "Both oldPolicy and newPolicy are required." },
        { status: 400 }
      );
    }

    // We need to forward these two files to the Python service
    // as multipart/form-data again.
    const forwardData = new FormData();
    forwardData.append("oldPolicy", oldPolicy);
    forwardData.append("newPolicy", newPolicy);

    // Call the Python AI service
    const aiRes = await fetch("http://127.0.0.1:8000/analyze_renewal", {
      method: "POST",
      body: forwardData,
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return NextResponse.json(
        { error: `AI service error: ${errText}` },
        { status: 500 }
      );
    }

    const data = await aiRes.json();

    // Send AI result back to the browser
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("renewal-analyze error:", err);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
