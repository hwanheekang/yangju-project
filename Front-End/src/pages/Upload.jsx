
import React, { useState, useEffect } from 'react';
import apiFetch from '../api';

const CATEGORIES = [
  '-- 선택 --',
  '식비', '교통비', '고정지출', '통신비', '교육비',
  '여가활동', '의료비', '의류비', '경조사비', '기타'
];

export default function Upload({ onClose, onUploadSuccess }) {
  const [step, setStep] = useState('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('jpeg, png 파일만 업로드할 수 있습니다.');
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  // 실제 이미지 업로드 및 AI 분석 요청
  const handleSubmit = async () => {
    if (!selectedFile) {
      alert('파일을 선택해주세요!');
      return;
    }
    setIsLoading(true);
    setStep('loading');
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      const res = await fetch('/api/upload-and-analyze', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem('jwtToken')}` }
      });
      if (!res.ok) throw new Error('AI 분석 실패');
      const { receipt } = await res.json();
      setOcrResult(receipt);
      setIsLoading(false);
      setStep('confirm');
    } catch (error) {
      alert('영수증 분석 중 오류: ' + error.message);
      setIsLoading(false);
      setStep('upload');
    }
  };
  
  // 실제 데이터 저장
  const handleFinalConfirm = async () => {
    if (selectedCategory === '-- 선택 --') {
      alert('카테고리를 선택해주세요.');
      return;
    }
    setIsLoading(true);
    try {
      const receiptData = {
        ...ocrResult,
        category: selectedCategory
      };
      await apiFetch('/receipts', {
        method: 'POST',
        body: JSON.stringify(receiptData)
      });
      alert('가계부에 성공적으로 등록되었습니다!');
      onUploadSuccess();
      onClose();
    } catch (error) {
      alert('데이터 저장에 실패했습니다: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // UI 렌더링 로직
  const renderContent = () => {
    if (isLoading) {
      return <p>AI가 영수증을 분석하고 있습니다. 잠시만 기다려주세요...</p>;
    }

    if (step === 'confirm' && ocrResult) {
      return (
        <div>
          <h2>AI 인식 결과 확인</h2>
          <div style={styles.resultContainer}>
            <label><strong>상호명:</strong>
              <input
                type="text"
                name="store_name"
                value={ocrResult.store_name || ''}
                onChange={e => setOcrResult({ ...ocrResult, store_name: e.target.value })}
                style={{ marginLeft: 8 }}
              />
            </label>
            <br />
            <label><strong>날짜:</strong>
              <input
                type="date"
                name="transaction_date"
                value={ocrResult.transaction_date ? ocrResult.transaction_date.slice(0,10) : ''}
                onChange={e => setOcrResult({ ...ocrResult, transaction_date: e.target.value })}
                style={{ marginLeft: 8 }}
              />
            </label>
            <br />
            <label><strong>금액:</strong>
              <input
                type="number"
                name="total_amount"
                value={ocrResult.total_amount || ''}
                onChange={e => setOcrResult({ ...ocrResult, total_amount: e.target.value })}
                style={{ marginLeft: 8 }}
              /> 원
            </label>
            <div style={styles.categorySelector}>
              <label htmlFor="category-select" style={{ marginRight: '10px' }}><strong>카테고리:</strong></label>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={{ padding: '5px' }}
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: 12 }}>
              <label><strong>메모:</strong>
                <input
                  type="text"
                  name="memo"
                  value={ocrResult.memo || ''}
                  onChange={e => setOcrResult({ ...ocrResult, memo: e.target.value })}
                  style={{ marginLeft: 8, width: '80%' }}
                  placeholder="메모를 입력하세요"
                />
              </label>
            </div>
          </div>
          <p>내용이 맞으신가요?</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleFinalConfirm} disabled={isLoading}>
              {isLoading ? '저장 중...' : '확인'}
            </button>
            <button onClick={() => setStep('upload')} disabled={isLoading}>다시 선택</button>
          </div>
        </div>
      );
    }

    // 기본적으로 'upload' 단계를 보여줌
    return (
      <div>
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/jpeg, image/png"
          disabled={isLoading}
        />
        {preview && (
          <div style={{ marginTop: '20px' }}>
            <img src={preview} alt="미리보기" style={{ maxWidth: '100%', maxHeight: '200px' }} />
          </div>
        )}
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? '처리 중...' : '업로드'}
          </button>
          <button onClick={onClose} disabled={isLoading}>취소</button>
        </div>
      </div>
    );
  };

  return <div>{renderContent()}</div>;
}

// 스타일 객체
const styles = {
  resultContainer: { margin: '20px 0', padding: '15px', border: '1px solid #eee', borderRadius: '8px' },
  categorySelector: { marginTop: '15px', display: 'flex', alignItems: 'center' },
};

