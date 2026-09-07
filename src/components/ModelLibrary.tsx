import { useState } from 'react';
import { Box, Search, X } from 'lucide-react';
import { assetUrl, type GalleryModel } from '../types';

interface Props {
  models: GalleryModel[];
  selectedId: string;
  onSelect: (id: string) => void;
}
export default function ModelLibrary({ models, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = models.filter((m) =>
    `${m.name} ${m.subtitle} ${m.id}`.toLocaleLowerCase().includes(normalized),
  );
  return (
    <aside className="library" aria-label="模型目录">
      <div className="library-heading">
        <h1>模型</h1>
        <span aria-label={`${models.length} 个模型`}>{models.length}</span>
      </div>
      <div className="search-field">
        <Search size={19} aria-hidden="true" />
        <input
          type="search"
          aria-label="搜索模型"
          placeholder="搜索模型"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="clear-search"
            aria-label="清除搜索"
            onClick={() => setQuery('')}
          >
            <X size={17} />
          </button>
        )}
      </div>
      <nav className="model-list" aria-label="选择模型">
        {filtered.map((model) => (
          <button
            key={model.id}
            className={`model-row ${model.id === selectedId ? 'selected' : ''}`}
            aria-pressed={model.id === selectedId}
            onClick={() => onSelect(model.id)}
          >
            <span className="thumbnail">
              {model.poster ? (
                <img src={assetUrl(model.poster)} alt="" loading="lazy" />
              ) : (
                <Box size={34} />
              )}
            </span>
            <span className="model-label">
              <strong>{model.name}</strong>
              <span>{model.subtitle}</span>
            </span>
          </button>
        ))}
        {!filtered.length && (
          <p className="empty-search" role="status">
            没有找到匹配的模型
          </p>
        )}
      </nav>
    </aside>
  );
}
