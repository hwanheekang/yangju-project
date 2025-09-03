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
    const imageUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`;

    // 2. Azure Document Intelligence 분석
    const endpoint = (process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '').replace(/\/$/, '');
    const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    const modelId = process.env.DI_MODEL_ID || 'prebuilt-receipt';
    const url = `${endpoint}/formrecognizer/documentModels/${modelId}:analyze?api-version=2023-07-31`;
    const body = { urlSource: imageUrl };
    console.log('Azure Document Intelligence 요청 URL:', url);
    console.log('분석 대상 이미지 URL:', imageUrl);
    let response;
    try {
      response = await axios.post(url, body, {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error('Azure Document Intelligence API 호출 실패:', err?.response?.status, err?.response?.statusText);
      console.error('에러 응답 데이터:', err?.response?.data);
      throw err;
    }
    console.log('Azure 응답 status:', response.status, response.statusText);
    console.log('Azure 응답 headers:', response.headers);
    console.log('Azure 응답 data:', response.data);

    // 202 Accepted → operation-location 폴링
    if (response.status === 202 && response.headers['operation-location']) {
      const operationLocation = response.headers['operation-location'];
      let pollResult = null;
      let pollCount = 0;
      const maxPoll = 15; // 최대 15초 대기
      const pollDelay = 1000; // 1초 간격
      while (pollCount < maxPoll) {
        await new Promise(r => setTimeout(r, pollDelay));
        pollCount++;
        try {
          const pollRes = await axios.get(operationLocation, {
            headers: { 'Ocp-Apim-Subscription-Key': apiKey }
          });
          if (pollRes.data.status === 'succeeded') {
            pollResult = pollRes.data;
            break;
          } else if (pollRes.data.status === 'failed') {
            console.error('Document Intelligence 분석 실패:', pollRes.data);
            return res.status(500).json({ error: 'AI 분석 실패', details: pollRes.data });
          }
        } catch (e) {
          console.error('Document Intelligence 폴링 중 에러:', e?.response?.data || e);
        }
      }
      if (!pollResult) {
        return res.status(504).json({ error: 'AI 분석 결과 대기 시간 초과' });
      }
      // 이후 기존 result 파싱 로직을 pollResult로 변경
      var result = pollResult;
    } else {
      // 예외 상황: 202가 아니거나 operation-location 없음
      return res.status(500).json({ error: 'AI 분석 요청 실패', details: response.data });
    }
    let receiptData = {};
    // 분석 결과 전체를 콘솔에 항상 출력 (빈 값/undefined/null 모두 확인)
    try {
      console.log('Document Intelligence result typeof:', typeof result);
      console.log('Document Intelligence result raw:', result);
      console.log('Document Intelligence result JSON:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('Document Intelligence result (raw print failed):', result);
    }
    const docResult = result?.analyzeResult?.documents?.[0];
    if (docResult && docResult.fields) {
      const fields = docResult.fields;
      try {
        console.log('Parsed fields:', JSON.stringify(fields, null, 2));
      } catch (e) {
        console.log('Parsed fields (raw):', fields);
      }
      // valueString 우선, 없으면 content 사용
      const storeName = fields.store_name?.valueString || fields.store_name?.content || '';
      let totalAmountRaw = fields.total_amount?.valueString || fields.total_amount?.content || '';
      totalAmountRaw = String(totalAmountRaw).replace(/[^0-9.-]/g, '');
      const totalAmount = parseFloat(totalAmountRaw) || 0;
      let dateRaw = fields.transaction_date?.valueString || fields.transaction_date?.content || '';
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
        source_blob_url: imageUrl
      };
    } else {
      console.log('No docResult or fields found in Document Intelligence response.');
    }
    res.json({ receipt: receiptData, imageUrl });
  } catch (err) {
    console.error('Upload & Analyze error:', err);
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


// 2. 앱 생성 및 환경변수 로드



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

// --- Azure Document Intelligence API 엔드포인트 ---
app.post('/api/document-intelligence', async (req, res) => {
  try {
    const { imageUrl, fileName } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const endpoint = (process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '').replace(/\/$/, '');
    const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    
    if (!endpoint || !apiKey) {
      return res.status(500).json({ error: 'Document Intelligence configuration is missing' });
    }

    const url = `${endpoint}/formrecognizer/documentModels/prebuilt-receipt:analyze?api-version=2023-07-31`;
    const body = { urlSource: imageUrl };

    const response = await axios.post(url, body, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    // 결과 파싱
    const result = response.data;
    if (result.documents && result.documents.length > 0) {
      const fields = result.documents[0].fields;
      const storeName = fields.store_name?.content || 'N/A';
      const totalAmount = parseFloat(String(fields.total_amount?.content).replace(/[^0-9.-]/g, '')) || 0;
      const transactionDate = fields.transaction_date?.content ? new Date(fields.transaction_date.content).toISOString() : new Date().toISOString();

      res.json({
        storeName,
        totalAmount,
        transactionDate
      });
    } else {
      res.status(400).json({ error: 'No receipt data found in the image' });
    }
  } catch (err) {
    console.error('Document Intelligence Error:', err);
    res.status(500).json({ error: 'Failed to process receipt image', details: err.message });
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