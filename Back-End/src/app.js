// 이미지 업로드 + 문서인텔리전스 분석 API

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol, StorageSharedKeyCredential } from '@azure/storage-blob';
import { pool } from './db.js';

dotenv.config();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// --- Azure Document Intelligence 공통 유틸 ---
const diApiVersion = process.env.DI_API_VERSION || '2023-07-31';
async function analyzeReceiptByUrl(publicUrl, { modelIdEnv } = {}) {
  const endpoint = (process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '').replace(/\/$/, '');
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  const modelId = modelIdEnv || process.env.DI_MODEL_ID || 'prebuilt-receipt';
  if (!endpoint || !apiKey) {
    const err = new Error('Missing Document Intelligence configuration');
    err.status = 500; throw err;
  }
  const url = `${endpoint}/formrecognizer/documentModels/${modelId}:analyze?api-version=${diApiVersion}`;
  const body = { urlSource: publicUrl };
  let initial;
  try {
    initial = await axios.post(url, body, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey, 'Content-Type': 'application/json' },
      validateStatus: () => true
    });
  } catch (e) {
    e.status = e?.response?.status || 500; throw e;
  }
  if (initial.status !== 202 || !initial.headers['operation-location']) {
    const err = new Error('Analyze request not accepted');
    err.status = initial.status;
    err.details = initial.data; throw err;
  }
  const opLoc = initial.headers['operation-location'];
  let pollCount = 0; const maxPoll = 30; // 최대 30초
  while (pollCount < maxPoll) {
    await new Promise(r => setTimeout(r, 1000));
    pollCount++;
    let pollRes;
    try {
      pollRes = await axios.get(opLoc, { headers: { 'Ocp-Apim-Subscription-Key': apiKey }, validateStatus: () => true });
    } catch (pe) {
      if (pollCount === maxPoll) { pe.status = 500; throw pe; }
      continue;
    }
    if (pollRes.status >= 400) {
      const err = new Error('Analyze poll error');
      err.status = pollRes.status; err.details = pollRes.data; throw err;
    }
    if (pollRes.data.status === 'succeeded') return pollRes.data;
    if (pollRes.data.status === 'failed') {
      const err = new Error('Analyze failed');
      err.status = 500; err.details = pollRes.data; throw err;
    }
  }
  const timeoutErr = new Error('Analyze timeout');
  timeoutErr.status = 504; throw timeoutErr;
}

// Environment and middleware baseline
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // allow server-to-server or same-origin without Origin header
    if (!origin) return cb(null, true);
    // allow all origins in non-prod for easier local dev
    if (!isProd) return cb(null, true);
    // in prod, restrict to configured list (empty list allows all)
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS not allowed'));
  },
  credentials: true,
}));
app.use(helmet());
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.post('/api/upload-and-analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // 1. Blob Storage 업로드
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const containerName = process.env.AZURE_BLOB_CONTAINER_NAME;
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`
    );
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = Date.now() + '-' + req.file.originalname;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });
    // SAS (읽기) 15분 부여 후 공용 URL 구성
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const sas = generateBlobSASQueryParameters({
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + 15 * 60 * 1000)
    }, sharedKeyCredential).toString();
    const publicUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sas}`;
    if (!isProd) console.log('[DEBUG] Blob public SAS URL (temp):', publicUrl);
    let result;
    try {
      result = await analyzeReceiptByUrl(publicUrl, {});
    } catch (e) {
      const status = e.status || 500;
      if (!isProd) console.error('[DI ERROR]', status, e.details || e.message);
      return res.status(status).json({ error: 'AI analyze failed', details: e.details || e.message });
    }
    let receiptData = {};
    // Verbose logging in non-prod only
    if (!isProd) {
      try {
        console.log('DI result typeof:', typeof result);
        console.log('DI result JSON:', JSON.stringify(result, null, 2));
      } catch (_) {}
    }
  const docResult = result?.analyzeResult?.documents?.[0];
    if (docResult && docResult.fields) {
      const fields = docResult.fields;
      if (!isProd) {
        try { console.log('Parsed fields:', JSON.stringify(fields, null, 2)); } catch (_) {}
      }
      // valueString 우선, 없으면 content 사용
      const storeName = fields.MerchantName?.value || fields.MerchantName?.content || fields.store_name?.valueString || fields.store_name?.content || '';
      let totalAmountRaw = fields.Total?.value || fields.Total?.content || fields.total_amount?.valueString || fields.total_amount?.content || '';
      totalAmountRaw = String(totalAmountRaw).replace(/[^0-9.-]/g, '');
      const totalAmount = parseFloat(totalAmountRaw) || 0;
      let dateRaw = fields.TransactionDate?.value || fields.TransactionDate?.content || fields.transaction_date?.valueString || fields.transaction_date?.content || '';
      let transactionDate = '';
      if (dateRaw) {
        transactionDate = dateRaw.replace(/\./g, '-').replace(/-$/,'');
        if (/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
          transactionDate = transactionDate;
        } else {
          transactionDate = new Date(dateRaw).toISOString();
        }
      }
      receiptData = {
        store_name: storeName,
        total_amount: totalAmount,
        transaction_date: transactionDate,
        source_blob_url: publicUrl
      };
    } else {
      if (!isProd) console.log('No docResult or fields found in DI response.');
    }
    res.json({ receipt: receiptData, imageUrl });
  } catch (err) {
    console.error('Upload & Analyze error:', err?.message || err);
    res.status(500).json({ error: 'Failed to upload or analyze image', details: err.message });
  }
});


app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const containerName = process.env.AZURE_BLOB_CONTAINER_NAME;
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`
    );
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobName = Date.now() + '-' + req.file.originalname;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });
    const url = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`;
    res.json({ url });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: 'Image upload failed', details: err.message });
  }
});
// 1. 모든 모듈 import 하기
// 1. 모든 모듈 import 하기
// (Imports are now consolidated at the top)

// Import routers
// auth.js와 receipts.js에서 export default router;를 사용했다면 아래처럼 중괄호 없이 가져와야 합니다.
import { authRouter } from './auth.js';
import { receiptsRouter } from './receipts.js';
import { preferencesRouter } from './preferences.js';
import { analyticsRouter } from './analytics.js';


// 2. 앱 생성 및 환경변수 로드



// 3. 미들웨어 설정 (moved to top for clarity)


// 4. API 라우트 설정
// --- Health Check Endpoint ---
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'UP' });
});

// --- DB Health Check Endpoint ---
app.get('/db-health', async (_, res) => {
  try {
    await pool.connect();
    res.status(200).json({ db: 'CONNECTED' });
  } catch (err) {
    res.status(500).json({ db: 'DISCONNECTED', error: err.message });
  }
});

// --- Azure Storage Health Check Endpoint ---
app.get('/storage-health', async (_, res) => {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      `DefaultEndpointsProtocol=https;AccountName=${process.env.AZURE_STORAGE_ACCOUNT_NAME};AccountKey=${process.env.AZURE_STORAGE_ACCOUNT_KEY};EndpointSuffix=core.windows.net`
    );
    const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_BLOB_CONTAINER_NAME);
    const exists = await containerClient.exists();
    if (exists) {
      res.status(200).json({ storage: 'CONNECTED', container: 'FOUND' });
    } else {
      res.status(404).json({ storage: 'CONNECTED', container: 'NOT_FOUND' });
    }
  } catch (err) {
    res.status(500).json({ storage: 'DISCONNECTED', error: err.message });
  }
});

// --- Blob SAS 토큰 발급 API ---
app.get('/api/blob-sas', async (req, res) => {
  try {
    const { blobName } = req.query;
    if (!blobName) return res.status(400).json({ error: 'blobName is required' });

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const containerName = process.env.AZURE_BLOB_CONTAINER_NAME;

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const expiresOn = new Date(Date.now() + 60 * 60 * 1000); // 1시간 후 만료
    const sasToken = generateBlobSASQueryParameters({
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('racw'), // 읽기, 추가, 생성, 쓰기
      startsOn: new Date(),
      expiresOn,
      protocol: SASProtocol.Https,
    }, sharedKeyCredential).toString();

    const sasUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
    res.json({ sasUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Azure Document Intelligence 연결 테스트 엔드포인트 ---
app.get('/test-di', async (req, res) => {
  try {
    const testImageUrl = req.query.testImageUrl || 'https://aka.ms/azai/receipt-sample';
    try {
      const diResult = await analyzeReceiptByUrl(testImageUrl, { modelIdEnv: 'prebuilt-receipt' });
      res.status(200).json({ status: 'CONNECTED', data: isProd ? undefined : diResult });
    } catch (e) {
      res.status(e.status || 500).json({ status: 'DISCONNECTED', error: e.message, details: isProd ? undefined : e.details });
    }
  } catch (err) {
    res.status(500).json({ status: 'DISCONNECTED', error: err.message, details: isProd ? undefined : err.response?.data });
  }
});

// --- Azure Document Intelligence API 엔드포인트 ---
// 기존 /api/document-intelligence 라우트 제거 (upload-and-analyze 사용 통일)

// --- 분리된 API 라우터들 연결 ---
app.use('/api/auth', authRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/analytics', analyticsRouter);

// --- Health check endpoint (for Azure Web App/VMSS) ---
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 5. 서버 실행 (PORT 환경변수 우선)
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});