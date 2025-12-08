import { NextResponse } from "next/server";

// --- MOCKED response (same shape as EZLynx XML → JSON result) ---
const MOCK_VIN_DATA = {
  VINValidateResult: {
    Result: "ExactMatch",
    ResultText: "Mock VIN decode successful.",
    VINEcho: "MOCKVIN1234567890",
    VehicleResults: {
      VehicleResult: {
        VIN: "MOCKVIN1234567890",
        Make: "TOYOTA",
        Model: "CAMRY",
        Year: "2020",
        BodyStyle: "SEDAN 4D",
        Drive: "Front",
        EngineInfo: "2.5L",
        Fuel: "Gasoline",
      },
    },
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const vin = body.vin?.trim().toUpperCase();

    if (!vin) {
      return NextResponse.json(
        { error: "VIN missing" },
        { status: 400 }
      );
    }

    // ❗❗❗ Always return mock while no sandbox exists
    return NextResponse.json({
      mock: true,
      data: MOCK_VIN_DATA,
    });

  } catch (e: any) {
    return NextResponse.json(
      {
        error: "VIN API ERROR",
        details: e.message,
      },
      { status: 500 }
    );
  }
}
