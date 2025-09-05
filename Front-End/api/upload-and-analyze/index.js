// Azure Functions (Node 18+)
// Parses multipart/form-data upload (field name: 'image'), sends to Azure Document Intelligence
// and returns a simplified receipt object.

const Busboy = require('busboy');

async function parseMultipart(req, context) {
  return new Promise((resolve, reject) => {
    try {
      const bb = Busboy({ headers: req.headers });
      const files = [];
      const fields = {};
      bb.on('file', (name, file, info) => {
        const chunks = [];
        file.on('data', (d) => chunks.push(d));
        file.on('end', () => {
          files.push({ fieldname: name, filename: info.filename, mimeType: info.mimeType, buffer: Buffer.concat(chunks) });
        });
      });
      bb.on('field', (name, val) => { fields[name] = val; });
      bb.on('error', reject);
      bb.on('close', () => resolve({ files, fields }));
      if (req.rawBody) {
        bb.end(req.rawBody);
      } else if (req.body) {
        const data = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
        bb.end(data);
      } else {
        reject(new Error('No request body'));
      }
    } catch (e) {
      reject(e);
    }
  });
}

async function analyzeWithADI(buffer, contentType, context) {
  const endpoint = process.env.DI_ENDPOINT; // e.g., https://<resourcename>.cognitiveservices.azure.com
  const key = process.env.DI_KEY;
  const modelId = process.env.DI_MODEL_ID || 'prebuilt-receipt';

  if (!endpoint || !key) {
    throw new Error('Missing DI_ENDPOINT or DI_KEY environment variables');
  }

  const submitUrl = `${endpoint}/formrecognizer/documentModels/${modelId}:analyze?api-version=2023-07-31`;
  const submitRes = await fetch(submitUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': contentType || 'application/octet-stream'
    },
    body: buffer
  });
  if (!submitRes.ok) {
    const text = await submitRes.text();
    throw new Error(`ADI submit failed: ${submitRes.status} ${text}`);
  }
  const opLocation = submitRes.headers.get('operation-location');
  if (!opLocation) throw new Error('Missing operation-location');

  let result;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const r = await fetch(opLocation, { headers: { 'Ocp-Apim-Subscription-Key': key } });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`ADI get failed: ${r.status} ${t}`);
    }
    const json = await r.json();
    const status = json.status || json.analyzeResult?.status;
    if (status === 'succeeded') { result = json; break; }
    if (status === 'failed') { throw new Error('ADI analysis failed'); }
  }
  if (!result) throw new Error('ADI analysis timed out');

  const doc = result.analyzeResult?.documents?.[0];
  const fields = doc?.fields || {};
  return {
    store_name: fields.MerchantName?.value || '',
    transaction_date: fields.TransactionDate?.content || fields.TransactionDate?.value || null,
    total_amount: fields.Total?.value || fields.Total?.amount || null,
    memo: ''
  };
}

module.exports = async function (context, req) {
  try {
    const contentType = req.headers['content-type'] || req.headers['Content-Type'];
    if (!contentType || !contentType.startsWith('multipart/form-data')) {
      throw new Error('Content-Type must be multipart/form-data');
    }

    const { files } = await parseMultipart(req, context);
    if (!files.length) throw new Error('No file uploaded');
    const file = files[0];

    const receipt = await analyzeWithADI(file.buffer, file.mimeType, context);

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { success: true, receipt }
    };
  } catch (err) {
    context.log.error('upload-and-analyze error:', err);
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: { success: false, message: 'AI 분석 실패', error: err.message }
    };
  }
};
