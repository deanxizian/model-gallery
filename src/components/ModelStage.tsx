import { useEffect, useRef, useState } from 'react';
import { Box, Maximize, Minimize, Pause, RotateCw } from 'lucide-react';
import type { ModelViewerElement } from '@google/model-viewer';
import { assetUrl, type GalleryModel } from '../types';

export default function ModelStage({ model }: { model: GalleryModel }) {
  const viewer = useRef<ModelViewerElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const element = viewer.current;
    if (!element) return;
    const onLoad = () => {
      setLoaded(true);
      setFailed(false);
    };
    const onError = () => {
      setFailed(true);
      setLoaded(false);
      setRotating(false);
    };
    const onProgress = (e: Event) =>
      setProgress(
        (e as CustomEvent<{ totalProgress: number }>).detail.totalProgress,
      );
    element.addEventListener('load', onLoad);
    element.addEventListener('error', onError);
    element.addEventListener('progress', onProgress);
    if (element.loaded) onLoad();
    return () => {
      element.removeEventListener('load', onLoad);
      element.removeEventListener('error', onError);
      element.removeEventListener('progress', onProgress);
    };
  }, [reload]);
  useEffect(() => {
    const change = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('fullscreenchange', change);
    window.addEventListener('keydown', keyboard);
    document.body.classList.toggle('viewer-expanded', expanded);
    return () => {
      document.removeEventListener('fullscreenchange', change);
      window.removeEventListener('keydown', keyboard);
      document.body.classList.remove('viewer-expanded');
    };
  }, [expanded]);
  async function fullscreen() {
    if (expanded) {
      if (document.fullscreenElement) await document.exitFullscreen();
      setExpanded(false);
    } else {
      setExpanded(true);
      try {
        await stage.current?.requestFullscreen?.();
      } catch {
        /* CSS overlay fallback, including mobile Safari. */
      }
    }
  }
  function reset() {
    setRotating(false);
    if (viewer.current) {
      viewer.current.cameraOrbit = model.cameraOrbit;
      viewer.current.cameraTarget = 'auto auto auto';
      viewer.current.fieldOfView = '30deg';
      viewer.current.resetTurntableRotation();
      viewer.current.jumpCameraToGoal();
    }
  }
  return (
    <section
      ref={stage}
      className={`stage ${expanded ? 'expanded' : ''}`}
      aria-label={`${model.name} 3D 预览`}
    >
      <model-viewer
        key={reload}
        ref={viewer}
        src={assetUrl(model.preview)}
        alt={`${model.name}，拖动或使用方向键旋转，滚轮缩放`}
        camera-controls
        camera-orbit={model.cameraOrbit}
        auto-rotate={rotating || undefined}
        auto-rotate-delay="0"
        rotation-per-second="15deg"
        environment-image="legacy"
        tone-mapping="aces"
        shadow-intensity=".8"
        shadow-softness="1"
        exposure=".85"
        field-of-view="30deg"
        min-camera-orbit="auto auto 20%"
        max-camera-orbit="auto auto 250%"
        interaction-prompt="none"
        touch-action="pan-y"
        loading="eager"
      >
        <div slot="progress-bar" />
      </model-viewer>
      <button
        className="fullscreen icon-button"
        onClick={fullscreen}
        aria-label={expanded ? '退出全屏' : '全屏预览'}
        title={expanded ? '退出全屏' : '全屏预览'}
      >
        {expanded ? <Minimize /> : <Maximize />}
      </button>
      {!loaded && !failed && (
        <div className="loading-model" role="status">
          <span>正在加载模型…</span>
          <div className="progress-track">
            <span style={{ width: `${Math.max(6, progress * 100)}%` }} />
          </div>
        </div>
      )}
      {failed && (
        <div className="loading-model" role="alert">
          <span>3D 模型加载失败</span>
          <small>请检查网络或浏览器的 WebGL 支持。</small>
          <button
            onClick={() => {
              setFailed(false);
              setProgress(0);
              setReload((n) => n + 1);
            }}
          >
            重新加载
          </button>
        </div>
      )}
      <div className="stage-footer">
        <div className="viewer-controls" aria-label="预览控制">
          <button
            disabled={!loaded}
            onClick={() => setRotating((r) => !r)}
            aria-pressed={rotating}
          >
            {rotating ? <Pause /> : <RotateCw />}
            <span>{rotating ? '暂停旋转' : '自动旋转'}</span>
          </button>
          <span className="control-divider" />
          <button disabled={!loaded} onClick={reset}>
            <Box />
            <span>重置视角</span>
          </button>
        </div>
        <p className="gesture-hint">
          <span className="desktop-hint">拖动旋转 · 滚轮缩放</span>
          <span className="mobile-hint">拖动旋转 · 双指缩放</span>
        </p>
      </div>
    </section>
  );
}
