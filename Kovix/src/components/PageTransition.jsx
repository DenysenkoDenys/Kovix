import { useEffect, useRef } from 'react';
import '../style/PageTransition.css';

function PageTransition({ children, direction = 'left' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('page-enter-left', 'page-enter-right');
    void el.offsetWidth; 
    el.classList.add(direction === 'left' ? 'page-enter-left' : 'page-enter-right');
  }, [direction]);

  return (
    <div ref={ref} className="page-transition-wrapper">
      {children}
    </div>
  );
}

export default PageTransition;