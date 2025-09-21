import { useAppStore } from '../state/store';

export function GenerationGrid() {
  const images = useAppStore((state) => state.generatedImages);
  const selectedIds = useAppStore((state) => state.selectedImageIds);
  const toggleSelected = useAppStore((state) => state.toggleSelectedImage);
  const removeImage = useAppStore((state) => state.removeImage);
  const clearSelected = useAppStore((state) => state.clearSelectedImages);

  if (!images.length) {
    return (
      <section className="panel" aria-labelledby="generation-grid-heading">
        <div className="panel__header">
          <div>
            <h2 id="generation-grid-heading">Generations</h2>
            <p>Run a generation to populate the grid. Selected frames feed the GIF builder.</p>
          </div>
        </div>
        <p className="panel__empty">No images yet.</p>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="generation-grid-heading">
      <div className="panel__header">
        <div>
          <h2 id="generation-grid-heading">Generations</h2>
          <p>Select favourite frames. Remove any that miss the brief.</p>
        </div>
        <button type="button" className="button button--ghost" onClick={clearSelected}>
          Clear selection
        </button>
      </div>

      <div className="grid">
        {images.map((image) => {
          const isSelected = selectedIds.includes(image.id);
          return (
            <article key={image.id} className={`grid-card${isSelected ? ' grid-card--selected' : ''}`}>
              <button
                type="button"
                className="grid-card__toggle"
                onClick={() => toggleSelected(image.id)}
                aria-pressed={isSelected}
              >
                <img src={image.url} alt={image.description} loading="lazy" />
                <span>{isSelected ? 'Selected' : 'Select'}</span>
              </button>
              <footer className="grid-card__meta">
                <span className="grid-card__provider">{image.provider}</span>
                <button type="button" className="button button--ghost" onClick={() => removeImage(image.id)}>
                  Remove
                </button>
              </footer>
              <p className="grid-card__caption">{image.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}