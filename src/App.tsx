import { useEffect, useState } from 'react';
import GitHubMark from './components/GitHubMark';
import {
  assetUrl,
  repositoryUrl,
  type ArchiveFilter,
  type GalleryModel,
} from './types';
import {
  accessoriesOf,
  archiveSelection,
  filterDevices,
  modelRoute,
} from './archive';
import ModelLibrary from './components/ModelLibrary';
import ModelStage from './components/ModelStage';
import ModelDetails from './components/ModelDetails';
import ProductModels from './components/ProductModels';

function hashId() {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return '';
  }
}

export default function App() {
  const [models, setModels] = useState<GalleryModel[]>([]);
  const [selectedId, setSelectedId] = useState(hashId);
  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(assetUrl('catalog.json'), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('目录加载失败');
        const data = await response.json();
        if (!Array.isArray(data.models) || !data.models.length)
          throw new Error('还没有发布模型');
        setModels(data.models);
      })
      .catch((e) => {
        if (e.name !== 'AbortError')
          setError('模型目录暂时无法加载，请刷新重试。');
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const onHashChange = () => {
      const id = hashId();
      if (id !== 'model-details') {
        setSelectedId(id);
        setFilter('all');
        setQuery('');
        setBrand('');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
    };
  }, []);
  const filtered = filterDevices(models, filter, query, brand);
  const selected = archiveSelection(models, selectedId, filtered);
  function selectModel(id: string) {
    const model = models.find((model) => model.id === id);
    const route = model ? modelRoute(model) : id;
    if (hashId() !== route)
      history.pushState(
        null,
        '',
        `#${route.split('/').map(encodeURIComponent).join('/')}`,
      );
    setSelectedId(id);
  }
  function updateFilter(
    nextFilter: ArchiveFilter,
    nextQuery: string,
    nextBrand = brand,
  ) {
    setFilter(nextFilter);
    setQuery(nextQuery);
    setBrand(nextBrand);
    const next = archiveSelection(
      models,
      selectedId,
      filterDevices(models, nextFilter, nextQuery, nextBrand),
    );
    if (next && next.model.id !== selectedId) selectModel(next.model.id);
  }
  const pageTitle =
    selected &&
    (selectedId === selected.model.id ||
      selectedId === modelRoute(selected.model))
      ? `${selected.device.name}${selected.model.parentId ? ` · ${selected.model.name}` : ''} · Model Gallery`
      : 'Model Gallery';
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);
  return (
    <>
      <a className="skip-link" href="#model-details">
        跳到模型详情
      </a>
      <header className="header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Model Gallery 首页"
        >
          Model Gallery
        </a>
        <a
          className="repository-link"
          href={repositoryUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          title="GitHub"
        >
          <GitHubMark />
        </a>
      </header>
      {error ? (
        <main className="page-message" role="alert">
          <p>{error}</p>
          <button onClick={() => location.reload()}>重新加载</button>
        </main>
      ) : !models.length ? (
        <main className="page-message" role="status">
          正在打开模型藏馆…
        </main>
      ) : (
        <div className="workspace">
          <ModelLibrary
            models={models}
            filtered={filtered}
            selectedId={selected?.device.id ?? ''}
            filter={filter}
            query={query}
            brand={brand}
            onFilter={(value) => updateFilter(value, query)}
            onQuery={(value) => updateFilter(filter, value)}
            onBrand={(value) => updateFilter(filter, query, value)}
            onSelect={selectModel}
          />
          <main className="model-content">
            {selected ? (
              <>
                <ProductModels
                  device={selected.device}
                  accessories={accessoriesOf(models, selected.device.id)}
                  selectedId={selected.model.id}
                  onSelect={selectModel}
                />
                <ModelStage key={selected.model.id} model={selected.model} />
                <ModelDetails model={selected.model} device={selected.device} />
              </>
            ) : (
              <section
                className="archive-empty"
                id="model-details"
                aria-label="空档案分类"
              >
                <h2>
                  {query
                    ? '没有找到这件设备'
                    : filter === 'retired'
                      ? '还没有已退役的设备'
                      : '这个分类暂时为空'}
                </h2>
                <p>
                  {query
                    ? '试试设备名称、品牌或配件名称。'
                    : '在用的日常，退役后的回忆，都可以留在这里。'}
                </p>
                <button onClick={() => updateFilter('all', '', '')}>
                  查看全部设备
                </button>
              </section>
            )}
          </main>
        </div>
      )}
    </>
  );
}
