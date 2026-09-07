import type { GalleryModel } from '../types';
import DownloadMenu from './DownloadMenu';

export default function ModelDetails({ model }: { model: GalleryModel }) {
  return (
    <section className="model-details" id="model-details" aria-label="模型详情">
      <div className="model-information">
        <h2>{model.name}</h2>
        <p className="description">{model.description}</p>
        <div className="specifications">
          {model.dimensions && <span>{model.dimensions}</span>}
          {model.revision && <span>{model.revision}</span>}
        </div>
      </div>
      <div className="downloads" aria-label="下载模型文件">
        <DownloadMenu key={model.id} model={model} />
      </div>
    </section>
  );
}
