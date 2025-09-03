// 1. 모든 모듈 import 하기
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import axios from 'axios';
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol, StorageSharedKeyCredential } from '@azure/storage-blob';
import { pool } from './db.js';

// Import routers
// auth.js와 receipts.js에서 export default router;를 사용했다면 아래처럼 중괄호 없이 가져와야 합니다.
import { authRouter } from './auth.js';
import { receiptsRouter } from './receipts.js';


// 2. 앱 생성 및 환경변수 로드
dotenv.config();
const app = express();


// 3. 미들웨어 설정
app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());


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
app.get('/test-di', async (_, res) => {
  try {
    const endpoint = (process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '').replace(/\/$/, '');
    const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    const url = `${endpoint}/formrecognizer/documentModels/prebuilt-receipt:analyze?api-version=2023-07-31`;
    const body = { urlSource: 'https://raw.githubusercontent.com/Azure-Samples/cognitive-services-REST-api-samples/master/curl/form-recognizer/rest-api/receipt.png' }; // 실제 테스트 가능한 이미지 URL로 변경

    const response = await axios.post(url, body, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    res.status(200).json({ status: 'CONNECTED', data: response.data });
  } catch (err) {
    res.status(500).json({ status: 'DISCONNECTED', error: err.message, details: err.response?.data });
  }
});

// --- 분리된 API 라우터들 연결 ---
app.use('/api/auth', authRouter);
app.use('/api/receipts', receiptsRouter);


// 5. 서버 실행
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});