import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { initialStudioState, studioReducer, type StudioAction, type StudioState } from './studioReducer';

const StudioStateContext = createContext<StudioState | null>(null);
const StudioDispatchContext = createContext<React.Dispatch<StudioAction> | null>(null);

interface StudioProviderProps {
  children: ReactNode;
}

export const StudioProvider = ({ children }: StudioProviderProps) => {
  const [state, dispatch] = useReducer(studioReducer, initialStudioState);
  const dispatchValue = useMemo(() => dispatch, [dispatch]);

  return (
    <StudioDispatchContext.Provider value={dispatchValue}>
      <StudioStateContext.Provider value={state}>{children}</StudioStateContext.Provider>
    </StudioDispatchContext.Provider>
  );
};

export const useStudioState = () => {
  const context = useContext(StudioStateContext);
  if (!context) {
    throw new Error('useStudioState must be used within a StudioProvider');
  }
  return context;
};

export const useStudioDispatch = () => {
  const context = useContext(StudioDispatchContext);
  if (!context) {
    throw new Error('useStudioDispatch must be used within a StudioProvider');
  }
  return context;
};
