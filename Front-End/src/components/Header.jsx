import logo from '../assets/sm4.png';

export default function Header() {
  const handleLogoClick = () => {
    window.location.reload();
  };

  return (
  <header
      className="app-header"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
  padding: '10px 24px',
  background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        boxSizing: 'border-box',
        position: 'sticky',
        top: 0,
        zIndex: 900
      }}
    >
    <div
        className="header-inner"
        style={{
          width: '100%',
          maxWidth: 1000,
          margin: '0 auto',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* 좌측(컨텐츠 시작선)과 일직선 배치 */}
        <button
          className="btn upload-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('openUploadModal'))}
          aria-label="영수증 추가하기"
          style={{
            position: 'absolute',
            top: 0,
            right: 20,
            boxShadow: '0 2px 8px rgba(25,118,210,0.12)'
          }}
        >
          <span className="upload-btn__icon" aria-hidden="true">+</span>
          <span className="upload-btn__label">영수증 추가하기</span>
        </button>
        <img
          src={logo}
          alt="SnapMoney 로고"
          onClick={handleLogoClick}
          className="logo-img"
          style={{ width: 'auto', display: 'block', cursor: 'pointer' }}
        />
      </div>
    </header>
  );
}