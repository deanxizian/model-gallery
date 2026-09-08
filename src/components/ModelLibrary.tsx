import { Box, Search, X } from 'lucide-react';
import {
  assetUrl,
  statusLabels,
  type ArchiveFilter,
  type GalleryModel,
} from '../types';
import {
  accessoriesOf,
  brandsIn,
  devicesIn,
  ownedSpecification,
} from '../archive';

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
  const filters: { id: ArchiveFilter; label: string }[] = [
    { id: 'all', label: '全部' },
    ...(['active', 'retired', 'unknown'] as const).map((status) => ({
      id: status,
      label: statusLabels[status],
    })),
  ];
  return (
    <aside className="library" aria-label="我的设备">
      <div className="library-heading">
        <h1>我的设备</h1>
        <span aria-label={`${filtered.length} 件设备`}>
          {filtered.length} 件
        </span>
      </div>
      <div className="search-field">
        <Search size={19} aria-hidden="true" />
        <input
          type="search"
          aria-label="搜索设备或配件"
          placeholder="搜索设备"
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
      <div className="library-filters">
        <div className="filter-row" role="group" aria-label="按使用状态筛选">
          <span className="filter-label" aria-hidden="true">
            状态
          </span>
          <div className="filter-options">
            {filters
              .filter(
                (item) =>
                  item.id !== 'unknown' ||
                  devices.some(
                    (device) =>
                      (device.ownership?.status ?? 'unknown') === 'unknown',
                  ) ||
                  filter === item.id,
              )
              .map((item) => (
                <button
                  key={item.id}
                  aria-pressed={filter === item.id}
                  aria-label={item.id === 'all' ? '全部状态' : item.label}
                  onClick={() => onFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
          </div>
        </div>
        <div className="filter-row" role="group" aria-label="按品牌筛选">
          <span className="filter-label" aria-hidden="true">
            品牌
          </span>
          <div className="filter-options">
            <button
              aria-label="全部品牌"
              aria-pressed={brand === ''}
              onClick={() => onBrand('')}
            >
              全部
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
        </div>
      </div>
      <nav className="model-list" aria-label="选择设备">
        {filtered.map((model, index) => {
          const variant = ownedSpecification(model.ownership) || model.subtitle;
          const accessoryCount = accessoriesOf(models, model.id).length;
          const thumbnail = model.thumbnail ?? model.poster;
          return (
            <button
              key={model.id}
              className={`model-row ${model.id === selectedId ? 'selected' : ''}`}
              aria-pressed={model.id === selectedId}
              aria-label={model.name}
              onClick={() => onSelect(model.id)}
            >
              <span className="thumbnail">
                {thumbnail ? (
                  <img
                    src={assetUrl(thumbnail)}
                    alt=""
                    width={76}
                    height={76}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    decoding="async"
                  />
                ) : (
                  <Box size={34} />
                )}
              </span>
              <span className="model-label">
                <strong>{model.name}</strong>
                <span className="model-variant">{variant}</span>
                <span className="product-status">
                  <span className="device-status">
                    <i
                      className={`status-dot ${model.ownership?.status ?? 'unknown'}`}
                    />
                    {statusLabels[model.ownership?.status ?? 'unknown']}
                  </span>
                  {accessoryCount > 0 && (
                    <span className="accessory-count">
                      {accessoryCount} 件配件
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
        {!filtered.length && (
          <p className="empty-search" role="status">
            {query ? '没有找到匹配的设备' : '暂无设备'}
          </p>
        )}
      </nav>
    </aside>
  );
}
