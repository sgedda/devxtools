import axios from 'axios';
import { setupMockifyer } from '@sgedda/mockifyer-axios';

const record = process.env.MOCKIFYER_RECORD === 'true';
const port = process.env.PORT || '4599';
setupMockifyer({
  mockDataPath: process.env.MD || './mock-data/axios',
  useGlobalAxios: true,
  recordMode: record,
  domainPathRulesMode: 'record_all',
  logging: 'error',
  axiosInstance: axios,
});
const a = (await axios.get(`http://127.0.0.1:${port}/orders/7`)).data;
console.log('RESULT axios', record ? 'record' : 'replay', 'got version', a.version);
await new Promise((resolve) => setTimeout(resolve, 800));
