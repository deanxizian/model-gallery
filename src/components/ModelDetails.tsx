import { Download } from 'lucide-react';
import { assetUrl, type GalleryModel } from '../types';

export default function ModelDetails({ model }: { model: GalleryModel }) {
  const [primary, ...others] = model.downloads;
  return (
    <section className="model-details" id="model-details" aria-label="模型详情">
      <div className="model-information">
        <h2>{model.name}</h2>
        <p className="description">{model.description}</p>
        <div className="specifications">
          {model.dimensions && <span>{model.dimensions}</span>}
          {model.revision && <span>{model.revision}</span>}
        </div>
        {(model.note || model.source) && (
          <details className="model-note">
            <summary>模型说明</summary>
            <p>
              {model.note}{' '}
              {model.source && (
                <a href={model.source.url} target="_blank" rel="noreferrer">
                  {model.source.label}
                </a>
              )}
            </p>
          </details>
        )}
      </div>
      <div className="downloads" aria-label="下载模型文件">
        <a
          className="download-primary"
          href={assetUrl(primary.url)}
          download={`${model.id}-${primary.filename}`}
          title={`${(primary.bytes / 1e6).toFixed(2)} MB`}
        >
          <Download size={23} />
          <span>下载 {primary.label}</span>
        </a>
        {others.map((file) => (
          <a
            key={file.url}
            className="download-secondary"
            href={assetUrl(file.url)}
            download={`${model.id}-${file.filename}`}
            title={`${(file.bytes / 1e6).toFixed(2)} MB`}
          >
            {file.label}
          </a>
        ))}
      </div>
    </section>
  );
}
