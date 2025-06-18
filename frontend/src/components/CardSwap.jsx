import React, { useState, useEffect, useRef, Children, cloneElement, isValidElement } from 'react';

// Simple Card component
export const Card = React.memo(({ children, style = {} }) => (
  <div style={{
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
    ...style
  }}>
    {children}
  </div>
));

const CardSwap = ({
  width = 250,
  height = 350,
  cardDistance = 15,
  verticalDistance = 20,
  delay = 2500,
  pauseOnHover = false,
  skewAmount = 3,
  children
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const isPausedRef = useRef(false);

  const childrenArray = Children.toArray(children);
  const totalCards = childrenArray.length;

  const nextCard = () => {
    if (isAnimating || totalCards === 0) return;
    
    setIsAnimating(true);
    
    // Simulate the drop animation time
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % totalCards);
      // Allow a brief moment for the transition to start before allowing next animation
      setTimeout(() => {
        setIsAnimating(false);
      }, 100); 
    }, 600); // This should roughly match the CSS transition duration
  };

  useEffect(() => {
    if (totalCards === 0) return;

    const startInterval = () => {
      intervalRef.current = setInterval(() => {
        if (!isPausedRef.current) {
          nextCard();
        }
      }, delay);
    };

    startInterval();

    const container = containerRef.current;
    if (pauseOnHover && container) {
      const handleMouseEnter = () => {
        isPausedRef.current = true;
      };
      
      const handleMouseLeave = () => {
        isPausedRef.current = false;
      };

      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
        clearInterval(intervalRef.current);
      };
    }

    return () => { // Cleanup interval on component unmount
      clearInterval(intervalRef.current);
    };
  }, [delay, pauseOnHover, totalCards]);

  const getCardPosition = (cardIndex) => {
    // Calculate the position of each card relative to the current front card
    // Handles wrapping around for the cycling effect
    let position = (cardIndex - currentIndex + totalCards) % totalCards;
    return position;
  };

  const getCardStyle = (cardIndex) => {
    const position = getCardPosition(cardIndex);
    const isFrontCard = position === 0;
    const isDropping = isFrontCard && isAnimating;

    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: width,
      height: height,
      transformOrigin: 'center center',
      transform: `
        translate(-50%, -50%) /* Center the card */
        translateX(${position * cardDistance}px) /* Horizontal distance */
        translateY(${-position * verticalDistance + (isDropping ? height * 1.5 : 0)}px) /* Vertical distance + drop effect */
        translateZ(${-position * 10}px) /* Z-depth for stacking */
        skewY(${skewAmount}deg) /* Apply skew to all cards */
        ${isDropping ? 'rotate(10deg)' : ''} /* Slight rotation during drop */
      `,
      zIndex: totalCards - position, // Ensure correct stacking order
      transition: isAnimating 
        ? 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)' /* Animation for the dropping card */
        : 'transform 0.3s ease-out', /* Animation for other cards shifting */
      opacity: position > totalCards / 2 ? 0 : 1, // Hide cards that are too far back
    };
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: width,
        height: height,
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        cursor: pauseOnHover ? 'pointer' : 'default',
      }}
    >
      {childrenArray.map((child, index) => (
        <div
          key={index}
          style={getCardStyle(index)}
        >
          {isValidElement(child) ? cloneElement(child, {
            style: {
              width: '100%',
              height: '100%',
              borderRadius: '12px',
              overflow: 'hidden',
              ...child.props.style,
            }
          }) : child}
        </div>
      ))}
    </div>
  );
};

export default CardSwap;
  