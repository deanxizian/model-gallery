import { useEffect, useState } from 'react';
import GitHubMark from './components/GitHubMark';
import { assetUrl, repositoryUrl, type GalleryModel } from './types';
import ModelLibrary from './components/ModelLibrary';
import ModelStage from './components/ModelStage';
import ModelDetails from './components/ModelDetails';

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
      if (id !== 'model-details') setSelectedId(id);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const selected = models.find((model) => model.id === selectedId) ?? models[0];
  useEffect(() => {
    if (selected) document.title = `${selected.name} · 模型藏馆`;
  }, [selected]);
  return (
    <>
      <a className="skip-link" href="#model-details">
        跳到模型详情
      </a>
      <header className="header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Model Gallery 模型藏馆首页"
        >
          <span>Model Gallery</span>
          <span className="site-title">模型藏馆</span>
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
      ) : !selected ? (
        <main className="page-message" role="status">
          正在打开模型藏馆…
        </main>
      ) : (
        <div className="workspace">
          <ModelLibrary
            models={models}
            selectedId={selected.id}
            onSelect={(id) => {
              location.hash = id;
              setSelectedId(id);
            }}
          />
          <main className="model-content">
            <ModelStage key={selected.id} model={selected} />
            <ModelDetails model={selected} />
          </main>
        </div>
      )}
    </>
  );
}
