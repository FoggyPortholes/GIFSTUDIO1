import { FrameUploader } from './features/uploader/FrameUploader';
import { TimelinePanel } from './features/timeline/TimelinePanel';
import { PreviewPanel } from './features/preview/PreviewPanel';
import { ExportPanel } from './features/export/ExportPanel';
import { ReviewPanel } from './features/review/ReviewPanel';
import { StudioProvider, useStudio } from './features/studio/StudioContext';

const WorkspaceHeader = () => {
  const { stats } = useStudio();
  return (
    <header className="workspace__header">
      <div className="workspace__title">
        <p className="eyebrow">From-scratch rebuild</p>
        <h1>GIF Studio 2.0</h1>
        <p>
          A lean, client-first animation workshop rebuilt from the ground up. Import stills, arrange
          them into a timeline, fine tune timing, and export a looping GIF without leaving the
          browser.
        </p>
      </div>
      <dl className="stats">
        <div>
          <dt>Total frames</dt>
          <dd>{stats.frameCount}</dd>
        </div>
        <div>
          <dt>Duration (s)</dt>
          <dd>{stats.durationSeconds.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Width</dt>
          <dd>{stats.widthRange}</dd>
        </div>
        <div>
          <dt>Height</dt>
          <dd>{stats.heightRange}</dd>
        </div>
      </dl>
    </header>
  );
};

const Workspace = () => (
  <main className="workspace">
    <WorkspaceHeader />
    <div className="workspace__grid">
      <div className="workspace__column">
        <FrameUploader />
        <TimelinePanel />
      </div>
      <div className="workspace__column">
        <PreviewPanel />
        <ExportPanel />
        <ReviewPanel />
      </div>
    </div>
  </main>
);

const App = () => (
  <StudioProvider>
    <Workspace />
  </StudioProvider>
);

export default App;
