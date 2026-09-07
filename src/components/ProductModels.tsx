import type { GalleryModel } from '../types';

export default function ProductModels({
  device,
  accessories,
  selectedId,
  onSelect,
}: {
  device: GalleryModel;
  accessories: GalleryModel[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (!accessories.length) return null;
  return (
    <nav className="product-models" aria-label={`${device.name} 的本体与配件`}>
      <div className="product-model-options">
        {[device, ...accessories].map((model) => (
          <button
            key={model.id}
            aria-pressed={model.id === selectedId}
            onClick={() => onSelect(model.id)}
          >
            {model.id === device.id ? '设备本体' : model.name}
          </button>
        ))}
      </div>
    </nav>
  );
}
