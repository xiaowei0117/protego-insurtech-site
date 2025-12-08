export interface Driver {
  firstName: string;
  lastName: string;
  birthDate: string;
  relationship: string;
  maritalStatus: string;
  occupation: string;
  education: string;
  dlNumber: string;
  dlState: string;
}

export interface FormData {
  applicantId?: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  address: string;
  unit: string;
  city: string;
  state: string;
  zipCode: string;
  gender: string;
  residence: string;

  maritalStatus: string;
  drivers: Driver[];
  occupation: string;
  education: string;
  married: boolean;

  spouseFirstName: string;
  spouseLastName: string;
  spouseBirthDate: string;
  spouseEducation: string;
  spouseOccupation: string;

  currentInsurance: {
    hasInsurance: string;
    provider: string;
    duration: string;
    bodilyInjuryLimit: string;
    lapseDuration: string;
  };

  contact: {
    phone: string;
    email: string;
  };

  selectedPackage: string;

  coverage: {
    "Bodily Injury Liability": string;
    "Property Damage": string;
    "Uninsured/Underinsured Motorist Bodily Injury": string;
    "Uninsured/Underinsured Property Damage": string;
    "Medical Payment": string;
    "Personal Injury Protection": string;
    "Comprehensive Deductible": string;
    "Collision Deductible": string;
    Rental: string;
    Roadside: string;
  };
}
