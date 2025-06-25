import { useEffect, useRef } from 'react';

function useEffectAfterMount(effect, dependencies) {
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) {
      return effect();
    } else {
      mounted.current = true;
    }
  }, dependencies);
}

export default useEffectAfterMount;