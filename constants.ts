
import { Prize, StoreConfig } from './types';

export const INITIAL_PRIZES: Prize[] = [
  { id: '1', name: '10% de Desconto', description: 'Ganhou 10% na próxima compra!', iswinning: true },
  { id: '2', name: 'Brinde Surpresa', description: 'Retire um brinde no balcão!', iswinning: true },
  { id: '3', name: 'Vale R$ 20,00', description: 'Desconto direto no caixa.', iswinning: true },
  { id: '4', name: 'Tente Novamente', description: 'Não foi dessa vez!', iswinning: false },
];

export const INITIAL_CONFIG: StoreConfig = {
  name: 'JG',
  logoUrl: 'https://cdn-icons-png.flaticon.com/512/606/606547.png',
  primaryColor: '#4f46e5',
  whatsappnumber: '5564993071404',
  adminPassword: 'admin',
  adminContactNumber: '5564993408657',
  globalAdminPassword: '123', // Senha inicial solicitada
  platformClients: [],
};

export const SCRATCH_THRESHOLD = 45;
