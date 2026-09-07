import { Box, Search, X } from 'lucide-react';
import {
  assetUrl,
  statusLabels,
  type ArchiveFilter,
  type GalleryModel,
} from '../types';
import { accessoriesOf, brandsIn, devicesIn, filterDevices } from '../archive';

interface Props {
  models: GalleryModel[];
  filtered: GalleryModel[];
  selectedId: string;
  filter: ArchiveFilter;
  query: string;
  brand: string;
  onFilter: (filter: ArchiveFilter) => void;
  onQuery: (query: string) => void;
  onBrand: (brand: string) => void;
  onSelect: (id: string) => void;
}
export default function ModelLibrary({
  models,
  filtered,
  selectedId,
  filter,
  query,
  brand,
  onFilter,
  onQuery,
  onBrand,
  onSelect,
}: Props) {
  const devices = devicesIn(models);
  const matchingDevices = filterDevices(models, 'all', query, brand);
  const filters: { id: ArchiveFilter; label: string; count: number }[] = [
    { id: 'all', label: '全部', count: matchingDevices.length },
    ...(['active', 'retired', 'unknown'] as const).map((status) => ({
      id: status,
      label: statusLabels[status],
      count: matchingDevices.filter(
        (device) => (device.ownership?.status ?? 'unknown') === status,
      ).length,
    })),
  ];
  return (
    <aside className="library" aria-label="数码产品档案">
      <div className="library-heading">
        <h1>数码档案</h1>
        <span aria-label={`${devices.length} 件产品`}>{devices.length}</span>
      </div>
      <p className="library-intro">用 3D 留住拥有过的数码产品。</p>
      <div className="search-field">
        <Search size={19} aria-hidden="true" />
        <input
          type="search"
          aria-label="搜索产品或配件"
          placeholder="搜索产品或配件"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        {query && (
          <button
            className="clear-search"
            aria-label="清除搜索"
            onClick={() => onQuery('')}
          >
            <X size={17} />
          </button>
        )}
      </div>
      <div className="archive-filters" role="group" aria-label="按使用状态筛选">
        {filters
          .filter(
            (item) =>
              item.id !== 'unknown' || item.count > 0 || filter === item.id,
          )
          .map((item) => (
            <button
              key={item.id}
              aria-pressed={filter === item.id}
              onClick={() => onFilter(item.id)}
            >
              {item.label}
              <span>{item.count}</span>
            </button>
          ))}
      </div>
      <div className="brand-filters" role="group" aria-label="按品牌筛选">
        <span className="filter-label">品牌</span>
        <button aria-pressed={brand === ''} onClick={() => onBrand('')}>
          全部品牌
        </button>
        {brandsIn(models).map((name) => (
          <button
            key={name}
            aria-pressed={brand === name}
            onClick={() => onBrand(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <nav className="model-list" aria-label="选择产品">
        {filtered.map((model) => (
          <button
            key={model.id}
            className={`model-row ${model.id === selectedId ? 'selected' : ''}`}
            aria-pressed={model.id === selectedId}
            aria-label={model.name}
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
              <span className="product-status">
                <i
                  className={`status-dot ${model.ownership?.status ?? 'unknown'}`}
                />
                {statusLabels[model.ownership?.status ?? 'unknown']}
                {accessoriesOf(models, model.id).length > 0 && (
                  <span className="accessory-count">
                    含 {accessoriesOf(models, model.id).length} 件配件
                  </span>
                )}
              </span>
            </span>
          </button>
        ))}
        {!filtered.length && (
          <p className="empty-search" role="status">
            {query ? '没有找到匹配的产品' : '这个分类里还没有产品'}
          </p>
        )}
      </nav>
    </aside>
  );
}
