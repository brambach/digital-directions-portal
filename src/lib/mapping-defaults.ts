// Mapping category definitions and default KeyPay values for MVP

export type MappingCategory =
  | "leave_types"
  | "locations"
  | "pay_periods"
  | "pay_frequencies"
  | "employment_contracts"
  | "pay_categories"
  | "termination_reasons";

export interface CategoryDefinition {
  key: MappingCategory;
  label: string;
  description: string;
  icon: string; // Lucide icon name
}

export const MAPPING_CATEGORIES: CategoryDefinition[] = [
  {
    key: "leave_types",
    label: "Leave Types",
    description: "Map HiBob leave policies to KeyPay leave categories",
    icon: "CalendarDays",
  },
  {
    key: "locations",
    label: "Locations",
    description: "Map HiBob office locations to KeyPay locations",
    icon: "MapPin",
  },
  {
    key: "pay_periods",
    label: "Pay Periods",
    description: "Map pay period definitions between systems",
    icon: "Calendar",
  },
  {
    key: "pay_frequencies",
    label: "Pay Frequencies",
    description: "Map pay frequency schedules between systems",
    icon: "Repeat",
  },
  {
    key: "employment_contracts",
    label: "Employment Contracts",
    description: "Map employment types and contract categories",
    icon: "FileText",
  },
  {
    key: "pay_categories",
    label: "Pay Categories",
    description: "Map pay categories and earnings types",
    icon: "DollarSign",
  },
  {
    key: "termination_reasons",
    label: "Termination Reasons",
    description: "Map termination/cessation reasons between systems",
    icon: "UserX",
  },
];

// Default HiBob values seeded per category (common HiBob field values)
export const DEFAULT_HIBOB_VALUES: Record<MappingCategory, string[]> = {
  leave_types: [
    "Holiday",
    "Sick Leave",
    "Compassionate Leave",
    "Long Service Leave",
    "Parental Leave",
    "Community Service Leave",
    "Jury Duty",
    "Leave Without Pay",
    "Workers Compensation",
    "Study Leave",
    "TOIL",
  ],
  locations: [
    "Sydney Office",
    "Melbourne Office",
    "Brisbane Office",
    "Perth Office",
    "Adelaide Office",
    "Remote - Australia",
  ],
  pay_periods: [
    "Weekly",
    "Fortnightly",
    "Monthly",
  ],
  pay_frequencies: [
    "Weekly",
    "Fortnightly",
    "Monthly",
    "Bi-Monthly",
  ],
  employment_contracts: [
    "Full-Time",
    "Part-Time",
    "Casual",
    "Fixed Term Contract",
    "Contractor",
    "Intern",
  ],
  pay_categories: [
    "Base Salary",
    "Hourly Rate",
    "Overtime",
    "Car Allowance",
    "Phone Allowance",
    "Meal Allowance",
    "Travel Allowance",
    "Bonus",
    "Commission",
    "Salary Sacrifice",
  ],
  termination_reasons: [
    "Resignation",
    "Redundancy",
    "End of Contract",
    "Termination",
    "Retirement",
    "Deceased",
    "Mutual Agreement",
    "Transfer",
  ],
};

// Default KeyPay values seeded per category (standard Australian KeyPay instance)
export const DEFAULT_KEYPAY_VALUES: Record<MappingCategory, string[]> = {
  leave_types: [
    "Annual Leave",
    "Personal/Carer's Leave",
    "Compassionate Leave",
    "Long Service Leave",
    "Parental Leave",
    "Community Service Leave",
    "Jury Duty Leave",
    "Public Holiday",
    "Leave Without Pay",
    "Workers Compensation",
    "Study Leave",
    "Time Off in Lieu",
  ],
  locations: [
    "Sydney",
    "Melbourne",
    "Brisbane",
    "Perth",
    "Adelaide",
    "Canberra",
    "Hobart",
    "Darwin",
    "Gold Coast",
    "Remote",
  ],
  pay_periods: [
    "Weekly",
    "Fortnightly",
    "Monthly",
    "Quarterly",
  ],
  pay_frequencies: [
    "Weekly",
    "Fortnightly",
    "Monthly",
    "Bi-Monthly",
    "Quarterly",
    "Annually",
  ],
  employment_contracts: [
    "Full-Time",
    "Part-Time",
    "Casual",
    "Fixed Term",
    "Contractor",
    "Apprentice/Trainee",
    "Labour Hire",
  ],
  pay_categories: [
    "Base Salary",
    "Base Hourly",
    "Overtime - 1.5x",
    "Overtime - 2x",
    "Allowance - Car",
    "Allowance - Phone",
    "Allowance - Meal",
    "Allowance - Travel",
    "Bonus",
    "Commission",
    "Salary Sacrifice - Super",
    "Salary Sacrifice - Novated Lease",
    "Back Pay",
    "Redundancy",
    "ETP - Genuine",
    "ETP - Non-Genuine",
  ],
  termination_reasons: [
    "Voluntary Resignation",
    "Redundancy",
    "End of Contract",
    "Dismissal",
    "Retirement",
    "Deceased",
    "Abandonment",
    "Mutual Agreement",
    "Transfer",
    "Ill Health",
  ],
};

export function getCategoryLabel(key: MappingCategory): string {
  return MAPPING_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export function getCategoryDescription(key: MappingCategory): string {
  return MAPPING_CATEGORIES.find((c) => c.key === key)?.description ?? "";
}
