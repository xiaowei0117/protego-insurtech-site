import * as js2xmlparser from "js2xmlparser";

// === 小工具：把数字枚举映射为字符串（与示例一致）
function mapOwnership(n?: number): string {
  // 1 Own, 2 Finance, 3 Lease
  return n === 1 ? "Owned" : n === 2 ? "Financed" : n === 3 ? "Leased" : "Owned";
}
function mapUsage(n?: number): string {
  // 1 Commute, 2 Pleasure, 3 Business, 4 Farm
  return n === 1 ? "Commute" : n === 2 ? "Pleasure" : n === 3 ? "Business" : "Farm";
}
function mapMileage(n?: number): number {
  // 例：可把区间转为年里程估值（示例）
  switch (n) {
    case 1: return 3000;
    case 2: return 5000;
    case 3: return 7000;
    case 4: return 9000;
    case 5: return 11000;
    default: return 13000;
  }
}

// === 生成 <EZAUTO> XML
export function buildEZAUTOXml(input: {
  applicant: any;
  vehicles: any[];
  drivers: any[];
  spouse?: any | null;
  selectedPackage?: string;
  coverage?: Record<string, string>;
}): string {
  const { applicant, vehicles, drivers, selectedPackage, coverage } = input;

  // 拆分街道号与街道名（简单切分，容错处理）
  const streetNumber = (applicant.address || "").split(" ")[0] || "";
  const streetName = (applicant.address || "").split(" ").slice(1).join(" ") || applicant.address;

  const ezauto = {
    "@": {
      "xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
      "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "xmlns": "http://www.ezlynx.com/XMLSchema/Auto/V200",
    },
    Applicant: {
      ApplicantType: "Applicant",
      PersonalInfo: {
        Name: {
          // Prefix 可选
          FirstName: applicant.firstName || "",
          MiddleName: "",
          LastName: applicant.lastName || "",
        },
        DOB: applicant.birthDate || "",
        Gender: applicant.gender || "",
        MaritalStatus: applicant.maritalStatus || "",
        // 可选字段：
        Industry: "",
        Occupation: "",
        YearsWithEmployer: 0,
        YearsWithPreviousEmployer: 0,
        Relation: "Insured",
      },
      Address: {
        AddressCode: "StreetAddress",
        Addr1: {
          StreetName: streetName,
          StreetNumber: streetNumber,
          UnitNumber: applicant.unit || "",
        },
        Addr2: "",
        City: applicant.city || "",
        StateCode: applicant.state || "",
        County: "",                      // 可为空；如需可从 zipcode 到 county 的映射补上
        Zip5: applicant.zipCode || "",
        Phone: {
          PhoneType: "Mobile",
          PhoneNumber: applicant.phone || "",
        },
        PreferredContactMethod: "Phone (Mobile)",
        Validation: "None",
      },
    },

    // PriorPolicyInfo/PolicyInfo/ResidenceInfo 先给默认可选值（你 Step 4 做完可以带真实数据）
    PriorPolicyInfo: {
      PriorCarrier: "",        // e.g. "Other Standard"
      Expiration: "",
      YearsWithPriorCarrier: { Years: 0, Months: 0 },
      YearsWithContinuousCoverage: { Years: 0, Months: 0 },
      PriorLiabilityLimit: "",
      PriorPolicyTerm: "12 Month",
    },
    PolicyInfo: {
      PolicyTerm: "12 Month",
      Package: selectedPackage ? "Yes" : "No",
      Effective: "",
      CreditCheckAuth: "Yes",
    },
    ResidenceInfo: {
      CurrentAddress: {
        YearsAtCurrent: { Years: 0, Months: 0 },
        Ownership: "Apartment",
      },
    },

    Drivers: {
      Driver: drivers.length
        ? drivers.map((d, i) => ({
            "@": { id: String(i + 1) },
            Name: { FirstName: d.firstName || "", LastName: d.lastName || "" },
            Gender: d.gender || applicant.gender || "",
            DOB: d.birthDate || "",
            DLNumber: "",
            DLState: applicant.state || "",
            DateLicensed: "2008-01-01",
            DLStatus: "Valid",
            AgeLicensed: 16,
            MaritalStatus: d.maritalStatus || "",
            Relation: d.relationship || "Insured",
            Industry: d.industry || "",
            Occupation: d.occupation || "",
            PrincipalVehicle: 1,
            Rated: "Rated",
            SR22: "No",
            FR44: "No",
            LicenseRevokedSuspended: "No",
          }))
        : [
            // 如果没有 drivers，就用 Applicant 兜底为主驾
            {
              "@": { id: "1" },
              Name: { FirstName: applicant.firstName || "", LastName: applicant.lastName || "" },
              Gender: applicant.gender || "",
              DOB: applicant.birthDate || "",
              DLNumber: "",
              DLState: applicant.state || "",
              DateLicensed: "2008-01-01",
              DLStatus: "Valid",
              AgeLicensed: 16,
              MaritalStatus: applicant.maritalStatus || "",
              Relation: "Insured",
              Industry: "",
              Occupation: "",
              PrincipalVehicle: 1,
              Rated: "Rated",
              SR22: "No",
              FR44: "No",
              LicenseRevokedSuspended: "No",
            },
          ],
    },

    Vehicles: {
      Vehicle: vehicles.map((v, i) => ({
        "@": { id: String(i + 1) },
        UseVinLookup: v.vin ? "Yes" : "No",
        Year: v.year || "",
        Vin: v.vin || "",
        Make: (v.make || "").toUpperCase(),
        Model: (v.model || "").toUpperCase(),
        "Sub-Model": "",                // 可选
        PassiveRestraints: "Airbag Both Sides",
        AntiLockBrake: "Yes",
        Telematics: "No",
        TransportationNetworkCompany: "No",
        VehiclePurchaseDate: "2020-01-01",
      })),
    },

    VehiclesUse: {
      VehicleUse: vehicles.map((v, i) => ({
        "@": { id: String(i + 1) },
        Useage: mapUsage(v.useage),
        OneWayMiles: 0,
        DaysPerWeek: 5,
        WeeksPerMonth: 4,
        AnnualMiles: mapMileage(v.mileage),
        Ownership: mapOwnership(v.ownership),
        Odometer: 0,
        AdditionalModificationValue: 0,
        PrincipalOperator: 1,
        CostNew: 0,
        UsedForDelivery: "No",
        PriorDamagePresent: "No",
      })),
    },

    Coverages: {
      GeneralCoverage: {
        BI: coverage?.["BI/PD Liability"]?.split("/")?.[0] || "",
        PD: coverage?.["BI/PD Liability"]?.split("/")?.[2] || "",
        MP: (coverage?.PIP || "").replaceAll(",", ""),
        UM: coverage?.["Uninsured/Underinsured"] ? "State Minimum" : "",
        UIM: coverage?.["Uninsured/Underinsured"]?.split("/")?.slice(0,2).join("/") || "",
      },
      // 简化：按第 1 辆车映射碰撞/综合等
      VehicleCoverage: vehicles.map((_, i) => ({
        "@": { id: String(i + 1) },
        OtherCollisionDeductible: "2500",
        CollisionDeductible: (coverage?.Collision || "").replaceAll(",", "") || "1000",
        FullGlass: "No",
        TowingDeductible: "40",
        RentalDeductible: coverage?.Rental ? coverage.Rental : "No Coverage",
        LiabilityNotRequired: "No",
        LoanLeaseCoverage: "No",
      })),
      StateSpecificCoverage: {
        "TX-Coverages": {
          "TX-PIP": coverage?.PIP ? coverage.PIP.replaceAll(",", "") : "No Coverage",
          "TX-AutoDeathIndemnity": "5000",
          "TX-UMPD": "State Minimum",
        },
      },
    },

    VehicleAssignments: {
      VehicleAssignment: vehicles.map((_, i) => ({
        "@": { id: String(i + 1) },
        DriverAssignment: { "@": { id: "1" }, "#": 100 },
      })),
    },

    GeneralInfo: { RatingStateCode: applicant.state || "TX" },

    // 简化 ExtendedInfo（按你的需要可以扩充/删减）
    ExtendedInfo: [
      {
        "@": { name: "ICQ|CARRIERS|ST_TX" },
        valuepair: { "@": { name: "carriers_list" }, value: "1535" },
      },
      {
        "@": { name: "ICQ|NAME_VALUE_PAIRS" },
        valuepair: [
          { "@": { name: "dropdownPolicyType" }, value: (input.selectedPackage || "Standard") },
          { "@": { name: "emailBridge" }, value: "1" },
        ],
      },
    ],
  };

  return js2xmlparser.parse("EZAUTO", ezauto);
}

// === 生成 <SubmitQuote> XML（把 EZAUTO 包进去）
export function buildSubmitQuoteXml(input: {
  carrierExecutions: { CarrierID: number; PropertyValues?: string }[];
  templateId: number;
  ezautoXml: string; // 已经构建好的 <EZAUTO>...</EZAUTO> 字符串
}): string {
  const { carrierExecutions, templateId, ezautoXml } = input;

  // 注意：js2xmlparser 无法直接“内嵌字符串 XML”成节点，
  // 这里我们采用“字符串拼接”方式包裹，确保 EZAUTO 保持原命名空间与结构。
  const carriersXml = carrierExecutions
    .map(
      c => `<CarrierExecutionType><CarrierID>${c.CarrierID}</CarrierID><PropertyValues>${c.PropertyValues || ""}</PropertyValues></CarrierExecutionType>`
    )
    .join("");

  return `<?xml version="1.0" encoding="utf-8"?>
<SubmitQuote xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <QuoteData>
    <CarrierExecutions>${carriersXml}</CarrierExecutions>
    <TemplateId>${templateId}</TemplateId>
    <AutoXml>
${ezautoXml}
    </AutoXml>
  </QuoteData>
</SubmitQuote>`;
}
