import {
  Supplier,
  Species,
  Grade,
  Size,
  Count,
  PurchaseLocation,
  BankAccount,
  ExpenseType,
  Purchase,
  PaymentRecord,
  User,
  AuditLog,
  BusinessSettings,
  SlabType,
  DailyProcessingEntry,
  Customer,
  PortMaster,
  SalesInvoice
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
export const INITIAL_SIZES: Size[] = [];
export const INITIAL_COUNTS: Count[] = [];
export const INITIAL_LOCATIONS: PurchaseLocation[] = [];
export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [];
export const INITIAL_EXPENSE_TYPES: ExpenseType[] = [];
export const INITIAL_PURCHASES: Purchase[] = [];
export const INITIAL_PAYMENTS: PaymentRecord[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_SLAB_TYPES: SlabType[] = [];
export const INITIAL_PROCESSING_ENTRIES: DailyProcessingEntry[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_PORTS: PortMaster[] = [];
export const INITIAL_SALES_INVOICES: SalesInvoice[] = [];

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
    { id: 'spe-1', code: 'SPE-001', name: 'Penaeus Vannamei (White Shrimp)', scientificName: 'Litopenaeus vannamei', category: 'Shrimp / Prawns', productForm: 'Headless Shell-On (HLSO)', processingType: 'Block Frozen', hsCode: '03061790', active: true },
    { id: 'spe-2', code: 'SPE-002', name: 'Penaeus Monodon (Black Tiger Shrimp)', scientificName: 'Penaeus monodon', category: 'Shrimp / Prawns', productForm: 'Peeled & Deveined (PD)', processingType: 'Individual Quick Frozen (IQF)', hsCode: '03061790', active: true },
    { id: 'spe-3', code: 'SPE-003', name: 'Indian Squid (Kalamari)', scientificName: 'Loligo duvaucelii', category: 'Cephalopods', productForm: 'Cleaned Tubes & Rings', processingType: 'Blast Frozen', hsCode: '03074310', active: true },
    { id: 'spe-4', code: 'SPE-004', name: 'Yellowfin Tuna', scientificName: 'Thunnus albacares', category: 'Pelagic Finfish', productForm: 'Loins & Steaks', processingType: 'Plate Frozen', hsCode: '03038990', active: true }
  ],
  grades: [
    { id: 'grd-1', code: 'GRD-001', name: 'Grade A (Export Quality)', description: 'Prime intact shell, high luster', active: true },
    { id: 'grd-2', code: 'GRD-002', name: 'Grade B (Local Market)', description: 'Minor peel, processing grade', active: true },
    { id: 'grd-3', code: 'GRD-003', name: 'Reject / Damage', description: 'Broken, discolored', active: true }
  ],
  sizes: [
    { id: 'siz-1', code: 'SIZ-001', name: 'Small', description: 'Under 500g / Small fish', active: true },
    { id: 'siz-2', code: 'SIZ-002', name: 'Medium', description: '500g to 1 Kg / Medium', active: true },
    { id: 'siz-3', code: 'SIZ-003', name: 'Large', description: '1 Kg to 2 Kg / Large', active: true },
    { id: 'siz-4', code: 'SIZ-004', name: 'Extra Large (Jumbo)', description: 'Above 2 Kg / Jumbo catch', active: true }
  ],
  counts: [
    { id: 'cnt-1', code: 'CNT-001', name: '16/20', description: '16 to 20 pcs per kg', active: true },
    { id: 'cnt-2', code: 'CNT-002', name: '21/25', description: '21 to 25 pcs per kg', active: true },
    { id: 'cnt-3', code: 'CNT-003', name: '26/30', description: '26 to 30 pcs per kg', active: true },
    { id: 'cnt-4', code: 'CNT-004', name: '31/40', description: '31 to 40 pcs per kg', active: true },
    { id: 'cnt-5', code: 'CNT-005', name: '41/50', description: '41 to 50 pcs per kg', active: true },
    { id: 'cnt-6', code: 'CNT-006', name: '51/60', description: '51 to 60 pcs per kg', active: true },
    { id: 'cnt-7', code: 'CNT-007', name: '71/90', description: '71 to 90 pcs per kg', active: true },
    { id: 'cnt-8', code: 'CNT-008', name: '100+', description: 'Over 100 small count pcs', active: true }
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
  ],
  slabTypes: [
    { id: 'slb-1', code: 'SLB-001', name: '2.0 Kg Standard Export Block', standardWeightKg: 2.0, unit: 'Kg', productApplicability: 'Shrimp / Prawns', active: true },
    { id: 'slb-2', code: 'SLB-002', name: '1.8 Kg Glazed Slab', standardWeightKg: 1.8, unit: 'Kg', productApplicability: 'Shrimp / Prawns', active: true },
    { id: 'slb-3', code: 'SLB-003', name: '5.0 Kg Master Bulk Block', standardWeightKg: 5.0, unit: 'Kg', productApplicability: 'All Products', active: true },
    { id: 'slb-4', code: 'SLB-004', name: '10.0 Kg Industrial Carton', standardWeightKg: 10.0, unit: 'Kg', productApplicability: 'Pelagic Finfish', active: true },
    { id: 'slb-5', code: 'SLB-005', name: '1.0 Kg IQF Quick Pack', standardWeightKg: 1.0, unit: 'Kg', productApplicability: 'All Products', active: true },
    { id: 'slb-6', code: 'SLB-006', name: '0.5 Kg Retail Pouch', standardWeightKg: 0.5, unit: 'Kg', productApplicability: 'Cephalopods', active: true }
  ],
  customers: [
    {
      id: 'cust-1',
      code: 'CUST-001',
      name: 'Tokyo Marine Foods Co. Ltd',
      address: 'Tsukiji Fish Market Center, Chuo-ku, Tokyo 104-0045',
      country: 'Japan',
      contactPerson: 'Kenji Takahashi',
      phone: '+81 3 5555 0192',
      email: 'purchasing@tokyomarine.jp',
      taxId: 'JP-9010001023456',
      bankDetails: 'Bank of Tokyo-Mitsubishi UFJ, Tokyo Main (SWIFT: BOTKJPJT)',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'cust-2',
      code: 'CUST-002',
      name: 'Pacific Rim Seafood Imports LLC',
      address: '1420 Harbor Blvd, Suite 400, Long Beach, CA 90802',
      country: 'United States',
      contactPerson: 'Sarah Jenkins',
      phone: '+1 562 555 7890',
      email: 'orders@pacificrimseafood.com',
      taxId: 'US-95-4489210',
      bankDetails: 'JPMorgan Chase Bank N.A., Los Angeles (SWIFT: CHASUS33)',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'cust-3',
      code: 'CUST-003',
      name: 'Ocean King Distribution B.V.',
      address: 'Waalhaven Oostzijde 88, 3087 BM Rotterdam',
      country: 'Netherlands',
      contactPerson: 'Maarten van Dijk',
      phone: '+31 10 440 2200',
      email: 'logistics@oceanking.nl',
      taxId: 'NL-854790123B01',
      bankDetails: 'ING Bank N.V., Rotterdam (SWIFT: INGBNL2A)',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'cust-4',
      code: 'CUST-004',
      name: 'Iberia Mariscos S.L.',
      address: 'Puerto Pesquero de Vigo, Dársena 4, 36202 Vigo, Pontevedra',
      country: 'Spain',
      contactPerson: 'Carlos Martinez',
      phone: '+34 986 223 344',
      email: 'compras@iberiamariscos.es',
      taxId: 'ES-B36987123',
      bankDetails: 'Banco Santander, Vigo (SWIFT: BSCHESMM)',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'cust-5',
      code: 'CUST-005',
      name: 'Dragon Bay Fishery Pte Ltd',
      address: '15 Jurong Port Road, #03-01 Jurong Cold Store, Singapore 619115',
      country: 'Singapore',
      contactPerson: 'Lim Wei Ming',
      phone: '+65 6265 9988',
      email: 'trading@dragonbay.sg',
      taxId: 'SG-201509823M',
      bankDetails: 'DBS Bank Ltd, Singapore (SWIFT: DBSSSGSG)',
      active: true,
      createdAt: new Date().toISOString()
    }
  ],
  ports: [
    { id: 'port-1', code: 'INCOK', name: 'Cochin Port (Willingdon Island)', country: 'India', active: true },
    { id: 'port-2', code: 'INMUN', name: 'Mundra Port (APSEZ)', country: 'India', active: true },
    { id: 'port-3', code: 'INMAA', name: 'Chennai Port', country: 'India', active: true },
    { id: 'port-4', code: 'JPTYO', name: 'Port of Tokyo', country: 'Japan', active: true },
    { id: 'port-5', code: 'JPOSA', name: 'Port of Osaka', country: 'Japan', active: true },
    { id: 'port-6', code: 'USLAX', name: 'Port of Los Angeles (San Pedro)', country: 'United States', active: true },
    { id: 'port-7', code: 'USNYC', name: 'Port of New York & New Jersey', country: 'United States', active: true },
    { id: 'port-8', code: 'NLRTM', name: 'Port of Rotterdam', country: 'Netherlands', active: true },
    { id: 'port-9', code: 'ESVGO', name: 'Port of Vigo', country: 'Spain', active: true },
    { id: 'port-10', code: 'SGSIN', name: 'Port of Singapore (PSA)', country: 'Singapore', active: true }
  ]
};
