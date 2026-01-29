
export interface Prize {
  id: string;
  name: string;
  description: string;
  iswinning: boolean;
}

export interface Winner {
  id: string;
  userName: string;
  userPhone: string;
  prizeName: string;
  prizeCode: string;
  date: string;
}

export interface PlatformClient {
  id: string;
  name: string;
  phone: string;
  monthlyValue: number;
  startDate: string;
  isPaid: boolean;
}

export interface StoreConfig {
  name: string;
  logoUrl: string;
  primaryColor: string;
  whatsappnumber: string;
  adminPassword?: string;
  adminContactNumber?: string;
  globalAdminPassword?: string;
  platformClients?: PlatformClient[];
}

export type AppView = 'user-form' | 'scratching' | 'revealed' | 'admin' | 'already-played';
