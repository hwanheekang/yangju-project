module.exports = async function (context, req) {
  // 예시: POST 요청으로 이미지/텍스트 분석
  const input = req.body;

  // 실제 intelligence 처리 로직 (예시: AI 분석)
  // const result = await someAIService(input);

  context.res = {
    status: 200,
    body: {
      success: true,
      message: "Intelligence 분석 결과 예시",
      // result: result
    }
  };
};
