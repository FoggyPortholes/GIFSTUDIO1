export const ReviewPanel = () => (
  <section className="panel">
    <header className="panel__header">
      <div>
        <p className="eyebrow">Reflection</p>
        <h2>Feature review & lessons learned</h2>
      </div>
    </header>
    <div className="review__grid">
      <div>
        <h3>What&apos;s new in the rebuild</h3>
        <ul>
          <li>Drag & drop frame ingestion with resilient file parsing.</li>
          <li>Context-driven timeline management and preview controls.</li>
          <li>One-click GIF export powered by gifenc with fit modes and background control.</li>
          <li>Live stats to monitor total frames, duration, and asset dimensions.</li>
        </ul>
      </div>
      <div>
        <h3>Lessons we carried forward</h3>
        <ul>
          <li>Prioritise fast feedback loops with deterministic previews.</li>
          <li>Guard against resource leaks by revoking object URLs on cleanup.</li>
          <li>Keep export settings explicit so creators understand the resulting canvas.</li>
          <li>Design panels as independent modules to simplify future enhancements.</li>
        </ul>
      </div>
    </div>
  </section>
);
