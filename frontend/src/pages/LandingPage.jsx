import React from 'react';
import { useNavigate } from 'react-router-dom';
import placeholderImage from '../assets/logo.png';

const marqueeImages = [
  '/assets/marquee/image1.png',
  '/assets/marquee/image2.png',
  '/assets/marquee/image3.png',
  '/assets/marquee/image4.png',
  '/assets/marquee/image5.png',
  '/assets/marquee/image6.png',
];

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/signin');
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#000' }}>
      <style>{`
        @keyframes scrollMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .angled-marquee-container {
  position: absolute;
  top: -800px;
  left: -800px;
  width: 250%;
  height: 250%;
  transform: rotate(-30deg);
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: 0.5; /* Reduced visibility */
}

.marquee-row {
  display: flex;
  width: max-content;
  animation: scrollMarquee 50s linear infinite;
  filter: brightness(1.15) contrast(1.1);
}

.marquee-image {
  width: 220px;
  height: 140px;
  object-fit: cover;
  margin-right: 48px;
  border-radius: 16px;
  flex-shrink: 0;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
  opacity: 0.8; /* Slight fade */
}


        .marquee-row:nth-child(even) {
          animation-direction: reverse;
          animation-duration: 60s;
        }

        .marquee-row:nth-child(3n) {
          animation-duration: 80s;
        }

       
      `}</style>

      {/* Dynamic Marquee Background */}
      <div className="angled-marquee-container">
        {Array(12).fill(null).map((_, rowIndex) => (
          <div key={rowIndex} className="marquee-row">
            {Array(5).fill(marqueeImages).flat().map((src, i) => (
              <img
                key={`${rowIndex}-${i}`}
                src={src}
                alt={`marquee-${rowIndex}-${i}`}
                className="marquee-image"
              />
            ))}
          </div>
        ))}
      </div>

      {/* Foreground Content */}
      <section style={{
  position: 'relative',
  zIndex: 2,
  padding: '40px 20px',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}}>
  <div style={{
    maxWidth: '1200px',
    width: '100%',
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '2.5rem',
    borderRadius: '20px',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: '#fff',
    boxShadow: '0 0 60px rgba(0, 0, 0, 0.4)',
  }}>
    

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '3rem',
            alignItems: 'center',
          }}>
            {/* Left Column */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}>
                <div style={{
                  width: 90,
                  height: 90,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #fff, #f8f9fa)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                  border: '2px solid rgba(255,255,255,0.25)',
                }}>
                  <img src={placeholderImage} alt="App Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <h1 style={{
                  fontSize: '3.8rem',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  margin: 0,
                  background: 'linear-gradient(45deg, #fff, #e8f0fe)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '2px 2px 10px rgba(255,255,255,0.2)'
                }}>
                  Local Pulse
                </h1>
              </div>

              <h2 style={{
                fontSize: '1.7rem',
                marginBottom: '2rem',
                opacity: 0.95,
                lineHeight: 1.7,
                fontWeight: 300,
              }}>
                Cinema-style updates for your neighborhood, in real-time.
              </h2>

              <p style={{
                fontSize: '1.3rem',
                opacity: 0.92,
                lineHeight: 1.8,
                fontWeight: 400,
              }}>
                Share hyperlocal, real-time updates. Discover what’s happening around you — instantly.
              </p>

              <button
                onClick={handleGetStarted}
                style={{
                  marginTop: '2.5rem',
                  padding: '1rem 3rem',
                  fontSize: '1.3rem',
                  borderRadius: '50px',
                  backgroundColor: '#fff',
                  color: '#667eea',
                  fontWeight: 'bold',
                  boxShadow: '0 10px 36px rgba(0,0,0,0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#edf2ff';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 36px rgba(0,0,0,0.3)';
                }}
              >
                🚀 Get Started
              </button>
            </div>

            {/* Right Column */}
            <div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: 'rgba(255,255,255,0.95)',
              }}>
                Why use Local Pulse?
              </h3>
              <ul style={{
                paddingLeft: '1rem',
                lineHeight: 2,
                listStyleType: 'none',
              }}>
                {[
                  { icon: '⚡', text: 'Real-Time Updates' },
                  { icon: '🤝', text: 'Community Driven' },
                  { icon: '📍', text: 'Location Based' },
                  { icon: '🔒', text: 'Privacy Focused' },
                ].map((item, i) => (
                  <li key={i} style={{
                    marginBottom: '0.5rem',
                    fontSize: '1.2rem',
                    position: 'relative',
                    paddingLeft: '2rem',
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      fontSize: '1.3rem',
                    }}>
                      {item.icon}
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
