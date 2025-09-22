import { StudioProvider } from './features/studio/StudioProvider';
import { StudioWorkspace } from './features/workspace/StudioWorkspace';

const App = () => (
  <StudioProvider>
    <StudioWorkspace />
  </StudioProvider>
);

export default App;
