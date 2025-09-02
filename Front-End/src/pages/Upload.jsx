// src/pages/Upload.jsx

import React, { useState, useEffect } from 'react';

// AI 서버 응답을 흉내 내는 가짜 함수
const mockOcrApi = (file) => {
  console.log("AI 서버로 파일을 전송합니다:", file.name);
  return new Promise((resolve) => {
    setTimeout(() => {
      // 2초 후, AI가 인식한 가짜 결과 데이터를 반환합니다.
      const result = {
        businessName: '스타벅스 양주점',
        date: '2025-09-02',
        amount: '5,500원'
      };
      console.log("AI 서버로부터 인식 결과를 받았습니다:", result);
      resolve(result);
    }, 2000); // 2초 딜레이
  });
};


export default function Upload({ onClose }) {
  // 1. 상태 변수 추가
  const [step, setStep] = useState('upload'); // 'upload', 'loading', 'confirm' 3가지 상태
  const [isLoading, setIsLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null); // AI 인식 결과를 저장할 상태

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

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

  // 2. '업로드' 버튼 클릭 시 실행될 함수
  const handleSubmit = async () => {
    if (!selectedFile) {
      alert('파일을 선택해주세요!');
      return;
    }
    setIsLoading(true);
    setStep('loading'); // 로딩 단계로 변경

    // AI 서버로 파일 전송 및 결과 받기
    const result = await mockOcrApi(selectedFile);
    
    setOcrResult(result); // 결과 저장
    setIsLoading(false);
    setStep('confirm'); // 확인 단계로 변경
  };
  
  // 3. 최종 '확인' 버튼 클릭 시 실행될 함수
  const handleFinalConfirm = () => {
    // 이 곳에서 최종 데이터를 가계부에 저장하는 로직을 실행합니다.
    console.log("가계부에 저장될 최종 데이터:", ocrResult);
    alert('가계부에 성공적으로 등록되었습니다!');
    onClose(); // 모든 과정이 끝나면 모달을 닫습니다.
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div>
      {/* 4. 단계별로 다른 UI 보여주기 */}

      {/* 로딩 중일 때 보여줄 UI */}
      {isLoading && <p>AI가 영수증을 분석하고 있습니다. 잠시만 기다려주세요...</p>}

      {/* 1단계: 파일 업로드 UI */}
      {step === 'upload' && !isLoading && (
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
      )}

      {/* 2단계: AI 인식 결과 확인 UI */}
      {step === 'confirm' && ocrResult && !isLoading && (
        <div>
          <h2>AI 인식 결과 확인</h2>
          <div style={{ margin: '20px 0' }}>
            <p><strong>상호명:</strong> {ocrResult.businessName}</p>
            <p><strong>날짜:</strong> {ocrResult.date}</p>
            <p><strong>금액:</strong> {ocrResult.amount}</p>
          </div>
          <p>내용이 맞으신가요?</p>
          <button onClick={handleFinalConfirm}>확인</button>
          <button onClick={() => setStep('upload')}>다시 선택</button>
        </div>
      )}
    </div>
  );
}