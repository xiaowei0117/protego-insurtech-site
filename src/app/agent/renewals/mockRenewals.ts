export type RenewalPolicy = {
  id: string;
  itemNumber: string;
  policyNumber: string;
  firstName: string;
  lastName: string;
  expirationDate: string;
  lineOfBusiness: string;
  writingCarrier: string;
  policyPremium: number;
};

export const mockRenewals: RenewalPolicy[] = [
  {
    id: "renewal-1001",
    itemNumber: "ITM-20381",
    policyNumber: "PC-458201",
    firstName: "Olivia",
    lastName: "Nguyen",
    expirationDate: "2026-03-01",
    lineOfBusiness: "Personal Auto",
    writingCarrier: "Protego Preferred",
    policyPremium: 1680,
  },
  {
    id: "renewal-1002",
    itemNumber: "ITM-20402",
    policyNumber: "PC-458947",
    firstName: "David",
    lastName: "Lee",
    expirationDate: "2026-03-08",
    lineOfBusiness: "Homeowners",
    writingCarrier: "Lighthouse Mutual",
    policyPremium: 1420,
  },
  {
    id: "renewal-1003",
    itemNumber: "ITM-20477",
    policyNumber: "PC-459332",
    firstName: "Amelia",
    lastName: "Garcia",
    expirationDate: "2026-03-15",
    lineOfBusiness: "Personal Auto",
    writingCarrier: "Summit Guard",
    policyPremium: 1905,
  },
];
