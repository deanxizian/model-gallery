import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { assetUrl, type GalleryModel } from '../types';

const formatDescriptions: Record<string, string> = {
  stl: '3D 打印网格',
  step: 'CAD 实体模型',
  stp: 'CAD 实体模型',
  glb: '含材质的 3D 模型',
  obj: '3D 网格模型',
  '3mf': '3D 打印格式',
  blend: 'Blender 工程',
  zip: '文件压缩包',
};

export default function DownloadMenu({ model }: { model: GalleryModel }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div
      ref={container}
      className="download-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="download-primary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Download size={23} aria-hidden="true" />
        <span>下载模型</span>
        <ChevronDown
          className={open ? 'chevron open' : 'chevron'}
          size={18}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          id={panelId}
          className="download-options"
          role="group"
          aria-label="选择下载格式"
        >
          <p className="download-heading">选择文件格式</p>
          <ul>
            {model.downloads.map((file) => {
              const extension =
                file.filename.split('.').at(-1)?.toLowerCase() ?? '';
              return (
                <li key={file.url}>
                  <a
                    href={assetUrl(file.url)}
                    download={`${model.id}-${file.filename}`}
                    onClick={() => {
                      setOpen(false);
                      trigger.current?.focus();
                    }}
                  >
                    <span className="download-format">
                      <strong>{file.label}</strong>
                      <span>{formatDescriptions[extension] ?? '模型文件'}</span>
                    </span>
                    <span className="download-size">
                      {(file.bytes / 1e6).toFixed(2)} MB
                    </span>
                    <Download size={16} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
