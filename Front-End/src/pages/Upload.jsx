import React, { useState, useEffect } from 'react';
import apiFetch from '../api';

// 테스트용 가짜 API
const mockOcrApi = (file) => {
  console.log("AI 서버로 파일을 전송합니다:", file.name);
  return new Promise((resolve) => {
    setTimeout(() => {
      const result = {
        storeName: '스타벅스 양주점',
        date: '2025-09-03',
        amount: 5500
      };
      resolve(result);
    }, 2000);
  });
};

const CATEGORIES = [
  '-- 선택 --', // 사용자가 선택하도록 유도하는 플레이스홀더
  '식비', '교통비', '고정지출', '통신비', '교육비',
  '여가활동', '의료비', '의류비', '경조사비', '기타'
];

export default function Upload({ onClose, onUploadSuccess }) {
  const [step, setStep] = useState('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]); // 기본값을 '-- 선택 --'으로

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

  const handleSubmit = async () => {
    if (!selectedFile) {
      alert('파일을 선택해주세요!');
      return;
    }
    setIsLoading(true);
    setStep('loading');
    
    const result = await mockOcrApi(selectedFile);
    setOcrResult(result);
    setIsLoading(false);
    setStep('confirm');
  };
  
  const handleFinalConfirm = async () => {
    // 사용자가 카테고리를 선택했는지 확인 (선택사항)
    if (selectedCategory === '-- 선택 --') {
      alert('카테고리를 선택해주세요.');
      return; 
    }

    const finalData = {
      ...ocrResult,
      category: selectedCategory === '-- 선택 --' ? null : selectedCategory,
    };

    try {
      console.log("가계부에 저장될 최종 데이터:", finalData);
      alert('가계부에 성공적으로 등록되었습니다!');
      onUploadSuccess();
      onClose();
    } catch (error) {
      alert('데이터 저장에 실패했습니다: ' + error.message);
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
            <p><strong>상호명:</strong> {ocrResult.storeName}</p>
            <p><strong>날짜:</strong> {ocrResult.date}</p>
            <p><strong>금액:</strong> {ocrResult.amount.toLocaleString()}원</p>
            <div style={styles.categorySelector}>
              <label htmlFor="category-select" style={{ marginRight: '10px' }}><strong>카테고리:</strong></label>
              <select 
                id="category-select"
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ padding: '5px' }}
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
          <p>내용이 맞으신가요?</p>
          <button onClick={handleFinalConfirm}>확인</button>
          <button onClick={() => setStep('upload')}>다시 선택</button>
        </div>
      );
    }

    // 기본적으로 'upload' 단계를 보여줌
    return (
      <div>
        <h2>영수증 업로드</h2>
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/jpeg, image/png"
        />
        {preview && (
          <div style={{ marginTop: '20px' }}>
            <img src={preview} alt="미리보기" style={{ maxWidth: '100%', maxHeight: '200px' }} />
          </div>
        )}
        <div style={{ marginTop: '20px' }}>
          <button onClick={handleSubmit}>업로드</button>
          <button onClick={onClose}>취소</button>
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

