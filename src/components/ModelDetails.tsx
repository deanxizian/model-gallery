import { statusLabels, type GalleryModel } from '../types';
import { ChevronLeft } from 'lucide-react';
import DownloadMenu from './DownloadMenu';
import { ownedSpecification } from '../archive';

export default function ModelDetails({
  model,
  device,
}: {
  model: GalleryModel;
  device: GalleryModel;
}) {
  const accessory = model.id !== device.id;
  const ownership = device.ownership;
  const specification = ownedSpecification(ownership);
  const status = ownership?.status ?? 'unknown';
  return (
    <section className="model-details" id="model-details" aria-label="模型详情">
      <div className="model-summary">
        <div className="model-information">
          <p className="model-category">
            {accessory
              ? `${device.name} · 配件`
              : [model.brand, model.category].filter(Boolean).join(' · ')}
          </p>
          <div className="model-title">
            <h2>{model.name}</h2>
            {!accessory && (
              <span className={`status-badge ${status}`}>
                <i className={`status-dot ${status}`} />
                {statusLabels[status]}
              </span>
            )}
          </div>
          <p className="description">{model.description}</p>
          {!model.specGroups?.length && (
            <div className="specifications">
              {model.dimensions && <span>{model.dimensions}</span>}
              {model.revision && <span>{model.revision}</span>}
            </div>
          )}
        </div>
        <div className="downloads" aria-label="下载模型文件">
          <DownloadMenu key={model.id} model={model} />
        </div>
      </div>
      {!accessory && (
        <section className="ownership-record" aria-label="拥有记录">
          <h3>拥有记录</h3>
          <dl className="ownership-grid">
            <div>
              <dt>购入时间</dt>
              <dd className={!ownership?.acquired ? 'unconfirmed' : undefined}>
                {ownership?.acquired || '待补充'}
              </dd>
            </div>
            <div className="ownership-specification">
              <dt>我的规格</dt>
              <dd className={!specification ? 'unconfirmed' : undefined}>
                {specification || '待补充'}
              </dd>
            </div>
          </dl>
          {ownership?.memory && (
            <div className="personal-memory">
              <h4>留个念想</h4>
              <p>{ownership.memory}</p>
            </div>
          )}
        </section>
      )}
      {model.specGroups?.length ? (
        <details className="product-specs" key={model.id} aria-label="参数规格">
          <summary>
            <h3>参数规格</h3>
            <ChevronLeft size={19} aria-hidden="true" />
          </summary>
          <div className="spec-groups">
            {model.specGroups.map((group) => (
              <section className="spec-group" key={group.title}>
                <h4>{group.title}</h4>
                <dl>
                  {group.items.map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd
                        className={
                          item.value === null ? 'unconfirmed' : undefined
                        }
                      >
                        {item.value ?? '待补充'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
          {model.specSources?.length ? (
            <p className="spec-sources">
              规格参考：
              {model.specSources.map((source, index) => (
                <span
                  key={`${source.kind ?? 'official'}-${source.url ?? source.label}-${index}`}
                >
                  {index > 0 ? '、' : ''}
                  {source.kind === 'local-design' ? (
                    source.label
                  ) : (
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.label}
                    </a>
                  )}
                  <span>（核对于 {source.checkedAt}）</span>
                </span>
              ))}
              。拥有记录按实物信息填写。
            </p>
          ) : null}
        </details>
      ) : null}
    </section>
  );
}
