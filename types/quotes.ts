// src/types/quotes.ts
export type QuoteApplicantName = {
  prefix?: string; // e.g. "MR"
  firstName: string;
  middleName?: string;
  lastName: string;
};

export type QuoteApplicantPersonalInfo = {
  name: QuoteApplicantName;
  dob: string; // ISO: "1981-05-05"
  gender: "Male" | "Female" | "Other";
  maritalStatus: "Single" | "Married" | "Divorced" | "Widowed";
  industry?: string;
  occupation?: string;
  yearsWithEmployer?: number;
  yearsWithPreviousEmployer?: number;
  relation?: "Insured" | "Co-Applicant";
};

export type QuoteApplicantAddress = {
  addressCode?: "StreetAddress";
  streetNumber?: string;
  streetName?: string;
  unitNumber?: string;
  city: string;
  stateCode: string; // "TX"
  county?: string;
  zip5: string;
  phone?: {
    type?: "Mobile" | "Home" | "Work";
    number: string;
  };
  preferredContactMethod?: string; // "Phone (Mobile)"
  validation?: "None";
};

export type QuotePriorPolicyInfo = {
  priorCarrier?: string; // "Other Standard"
  expiration?: string;   // ISO date
  yearsWithPriorCarrier?: { years: number; months: number };
  yearsWithContinuousCoverage?: { years: number; months: number };
  priorLiabilityLimit?: string; // "30/60"
  priorPolicyTerm?: "6 Month" | "12 Month";
};

export type QuotePolicyInfo = {
  policyTerm: "6 Month" | "12 Month";
  package?: "Yes" | "No";
  effective?: string; // ISO
  creditCheckAuth?: "Yes" | "No";
};

export type QuoteResidenceInfo = {
  currentAddress?: {
    yearsAtCurrent: { years: number; months: number };
    ownership: "Apartment" | "Owned" | "Rented" | "Other";
  };
};

export type QuoteDriver = {
  id: string; // "1"
  name: { firstName: string; lastName: string };
  gender: "Male" | "Female" | "Other";
  dob: string; // ISO
  dlNumber?: string;
  dlState: string;
  dateLicensed?: string; // ISO
  dlStatus?: "Valid" | "Suspended" | "Other";
  ageLicensed?: number;
  maritalStatus?: QuoteApplicantPersonalInfo["maritalStatus"];
  relation?: "Insured" | "Co-Applicant" | "Spouse" | "Child" | "Other";
  industry?: string;
  occupation?: string;
  principalVehicle?: string; // vehicle id
  rated?: "Rated" | "Not Rated";
  sr22?: "Yes" | "No";
  fr44?: "Yes" | "No";
  licenseRevokedSuspended?: "Yes" | "No";
};

export type QuoteVehicle = {
  id: string; // "1"
  useVinLookup?: "Yes" | "No";
  year: number;
  vin?: string;
  make: string;
  model: string;
  subModel?: string;
  passiveRestraints?: string; // "Airbag Both Sides"
  antiLockBrake?: "Yes" | "No";
  telematics?: "Yes" | "No";
  tnc?: "Yes" | "No"; // TransportationNetworkCompany
  vehiclePurchaseDate?: string; // ISO
};

export type QuoteVehicleUse = {
  id: string; // "1"
  usage: "Business" | "Pleasure" | "Commute" | "Farm" | "Other";
  oneWayMiles?: number;
  daysPerWeek?: number;
  weeksPerMonth?: number;
  annualMiles?: number;
  ownership?: "Owned" | "Leased" | "Financed";
  odometer?: number;
  additionalModificationValue?: number;
  principalOperator?: string; // driver id
  costNew?: number;
  usedForDelivery?: "Yes" | "No";
  priorDamagePresent?: "Yes" | "No";
};

export type QuoteGeneralCoverage = {
  BI?: string;  // "30/60"
  PD?: string;  // "50000"
  MP?: string;  // "500"
  UM?: string;  // "State Minimum"
  UIM?: string; // "30/60"
};

export type QuoteVehicleCoverage = {
  id: string; // matches vehicle id
  otherCollisionDeductible?: number;
  collisionDeductible?: number;
  fullGlass?: "Yes" | "No";
  towingDeductible?: string; // e.g. "40"
  rentalDeductible?: string; // e.g. "No Coverage"
  liabilityNotRequired?: "Yes" | "No";
  loanLeaseCoverage?: "Yes" | "No";
};

export type QuoteStateSpecificCoverageTX = {
  pip?: "No Coverage" | string;
  autoDeathIndemnity?: string;
  umpd?: "State Minimum" | string;
};

export type QuoteCoverages = {
  general: QuoteGeneralCoverage;
  vehicle: QuoteVehicleCoverage[];
  stateSpecific?: { tx?: QuoteStateSpecificCoverageTX };
};

export type QuoteVehicleAssignment = {
  id: string; // vehicle id
  driverAssignment: { id: string; percent?: number }; // driver id
};

export type QuoteGeneralInfo = {
  ratingStateCode: string; // "TX"
};

export type QuoteExtendedKV = { name: string; value: string };
export type QuoteExtendedInfo = {
  name: string; // e.g. "ICQ|CARRIERS|ST_TX"
  pairs: QuoteExtendedKV[];
};

export type QuoteRequest = {
  // Optional xRef if you’ll use GET/PUT by xRef later:
  xrefKey?: string;

  applicant: {
    applicantType?: "Applicant";
    personalInfo: QuoteApplicantPersonalInfo;
    address: QuoteApplicantAddress;
  };

  priorPolicyInfo?: QuotePriorPolicyInfo;
  policyInfo: QuotePolicyInfo;
  residenceInfo?: QuoteResidenceInfo;

  drivers: QuoteDriver[];
  vehicles: QuoteVehicle[];
  vehiclesUse: QuoteVehicleUse[];

  coverages: QuoteCoverages;
  assignments: QuoteVehicleAssignment[];

  generalInfo: QuoteGeneralInfo;

  // Optional: pass carrier IDs, template, etc.
  extendedInfo?: QuoteExtendedInfo[];
};

export type QuoteSubmitResponse = {
  // When using RatingApi submit:
  applicantId?: string;
  quoteExecutionId?: string;
  warnings?: string[];
  // When using ApplicantApi create:
  applicantIdOnly?: string;
  url?: string;
};

export type QuoteSearchResponse = {
  // Your normalized list for UI
  carriers: Array<{
    carrierId: string;
    carrierName: string;
    monthlyPremium: number;
    termPremium: number;
    coveragesSummary?: string[];
  }>;
  meta?: {
    applicantId?: string;
    quoteExecutionId?: string;
  };
};
