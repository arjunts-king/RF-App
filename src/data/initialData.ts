import {
  Supplier,
  Species,
  Grade,
  SizeCount,
  PurchaseLocation,
  BankAccount,
  ExpenseType,
  Purchase,
  PaymentRecord,
  User,
  AuditLog,
  BusinessSettings
} from '../types';

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: 'Seafood Procurement Co.',
  tagline: 'Harbour Purchase Management & Procurement Accounting',
  address: 'Fisheries Terminal Road',
  district: '',
  state: '',
  gstin: '',
  pan: '',
  phone: '',
  email: '',
  financialYear: 'FY 2026-27',
  currencySymbol: '₹'
};

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    email: 'admin@seafood.local',
    name: 'Admin / Owner',
    role: 'admin',
    designation: 'Managing Director & Owner',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-2',
    email: 'master.acct@seafood.local',
    name: 'Master Accountant',
    role: 'master_accountant',
    designation: 'Senior Accountant',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-3',
    email: 'jr.acct@seafood.local',
    name: 'Junior Accountant',
    role: 'junior_accountant',
    designation: 'Field Purchase Officer',
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-4',
    email: 'viewer@seafood.local',
    name: 'Management Viewer',
    role: 'viewer',
    designation: 'Operations Observer',
    createdAt: new Date().toISOString()
  }
];

// Completely EMPTY default state — Ready for full customization by user!
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_SPECIES: Species[] = [];
export const INITIAL_GRADES: Grade[] = [];
export const INITIAL_SIZES: SizeCount[] = [];
export const INITIAL_LOCATIONS: PurchaseLocation[] = [];
export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [];
export const INITIAL_EXPENSE_TYPES: ExpenseType[] = [];
export const INITIAL_PURCHASES: Purchase[] = [];
export const INITIAL_PAYMENTS: PaymentRecord[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

// Optional starter templates that the user can import with 1 click if they want standard presets
export const SAMPLE_STARTER_PRESETS = {
  suppliers: [
    {
      id: 'sup-1',
      code: 'SUP-001',
      name: 'St. Antony Marine Trawlers',
      type: 'boat_owner' as const,
      contactPerson: 'Antony Joseph',
      phone: '+91 98470 11223',
      email: 'stantony.marine@gmail.com',
      address: 'Harbour Pier Road',
      district: 'Ernakulam',
      state: 'Kerala',
      gstin: '32AABCS1429B1Z2',
      pan: 'AABCS1429B',
      bankName: 'Federal Bank Munambam',
      bankAccount: '12890100456789',
      bankIfsc: 'FDRL0001289',
      paymentTerms: 'Net 7 Days',
      creditDays: 7,
      openingBalance: 0,
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'sup-2',
      code: 'SUP-002',
      name: 'Sagar Kanya Fisheries & Auction',
      type: 'auctioneer_agent' as const,
      contactPerson: 'Dinesh Patel',
      phone: '+91 94262 88441',
      email: 'sagarkanya.auction@yahoo.co.in',
      address: 'GIDC Industrial Estate, Veraval',
      district: 'Gir Somnath',
      state: 'Gujarat',
      gstin: '24AAACS7712M1Z9',
      pan: 'AAACS7712M',
      bankName: 'State Bank of India',
      bankAccount: '30459812675',
      bankIfsc: 'SBIN0000492',
      paymentTerms: 'Net 15 Days',
      creditDays: 15,
      openingBalance: 0,
      active: true,
      createdAt: new Date().toISOString()
    }
  ],
  species: [
    { id: 'spe-1', code: 'SPE-001', name: 'Penaeus Vannamei (White Shrimp)', scientificName: 'Litopenaeus vannamei', category: 'Shrimp / Prawns', active: true },
    { id: 'spe-2', code: 'SPE-002', name: 'Penaeus Monodon (Black Tiger Shrimp)', scientificName: 'Penaeus monodon', category: 'Shrimp / Prawns', active: true },
    { id: 'spe-3', code: 'SPE-003', name: 'Indian Squid (Kalamari)', scientificName: 'Loligo duvaucelii', category: 'Cephalopods', active: true },
    { id: 'spe-4', code: 'SPE-004', name: 'Yellowfin Tuna', scientificName: 'Thunnus albacares', category: 'Pelagic Finfish', active: true }
  ],
  grades: [
    { id: 'grd-1', code: 'GRD-001', name: 'Grade A (Export Quality)', description: 'Prime intact shell, high luster', active: true },
    { id: 'grd-2', code: 'GRD-002', name: 'Grade B (Local Market)', description: 'Minor peel, processing grade', active: true },
    { id: 'grd-3', code: 'GRD-003', name: 'Reject / Damage', description: 'Broken, discolored', active: true }
  ],
  sizes: [
    { id: 'siz-1', code: 'SIZ-001', name: '16/20', description: '16 to 20 pcs per kg', active: true },
    { id: 'siz-2', code: 'SIZ-002', name: '21/25', description: '21 to 25 pcs per kg', active: true },
    { id: 'siz-3', code: 'SIZ-003', name: '26/30', description: '26 to 30 pcs per kg', active: true },
    { id: 'siz-4', code: 'SIZ-004', name: '31/40', description: '31 to 40 pcs per kg', active: true },
    { id: 'siz-5', code: 'SIZ-005', name: '41/50', description: '41 to 50 pcs per kg', active: true },
    { id: 'siz-6', code: 'SIZ-006', name: '51/60', description: '51 to 60 pcs per kg', active: true },
    { id: 'siz-7', code: 'SIZ-007', name: '71/90', description: '71 to 90 pcs per kg', active: true },
    { id: 'siz-8', code: 'SIZ-008', name: '100+', description: 'Over 100 small count pcs', active: true }
  ],
  locations: [
    { id: 'loc-1', code: 'LOC-001', name: 'Kochi Fisheries Harbour', district: 'Ernakulam', state: 'Kerala', harbourCentre: 'Thoppumpady Main Wharf', active: true },
    { id: 'loc-2', code: 'LOC-002', name: 'Mangalore Old Port (Bunder)', district: 'Dakshina Kannada', state: 'Karnataka', harbourCentre: 'North Quay Fish Landing', active: true },
    { id: 'loc-3', code: 'LOC-003', name: 'Veraval Fishing Harbour', district: 'Gir Somnath', state: 'Gujarat', harbourCentre: 'Gosa Pier Wharf', active: true }
  ],
  bankAccounts: [
    { id: 'acc-1', code: 'ACC-001', name: 'HDFC Current Account', bank: 'HDFC Bank', accountType: 'Current' as const, openingBalance: 0, active: true },
    { id: 'acc-2', code: 'ACC-002', name: 'Harbour Petty Cash Float', bank: 'In-Hand Cash', accountType: 'Cash Float' as const, openingBalance: 0, active: true }
  ],
  expenseTypes: [
    { id: 'exp-1', code: 'EXP-001', name: 'Ice & Crushed Flake', category: 'Preservation', active: true },
    { id: 'exp-2', code: 'EXP-002', name: 'Vehicle Rent / Transport', category: 'Logistics', active: true },
    { id: 'exp-3', code: 'EXP-003', name: 'Commission & Dalali', category: 'Brokerage', active: true },
    { id: 'exp-4', code: 'EXP-004', name: 'Loading / Unloading Labour', category: 'Handling', active: true }
  ]
};
