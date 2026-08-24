import { useCallback, useMemo, useState } from 'react';
import {
  createBlockFromKind,
  cloneBlock,
  createInitialBlocks,
  DEFAULT_FORM_NAME,
  DRAFT_STORAGE_KEY,
} from '@/utils/formBuilderModel';

const reorderList = (list, fromId, toIndex) => {
  const fromIndex = list.findIndex((b) => b.id === fromId);
  if (fromIndex < 0) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  let insertAt = toIndex;
  if (fromIndex < toIndex) insertAt -= 1;
  insertAt = Math.max(0, Math.min(insertAt, next.length));
  next.splice(insertAt, 0, moved);
  return next;
};

/**
 * @param {object}   [opts]
 * @param {Array}    [opts.blocks]      seed the canvas with these instead of the
 *                                      สร้างแบบฟอร์มใหม่ starter set — used when
 *                                      editing an existing e-Document or starting
 *                                      from a คลังเอกสาร template.
 * @param {string}   [opts.name]        seed ชื่อแบบฟอร์ม.
 * @param {string}   [opts.storageKey]  localStorage key for saveDraft. Pass a
 *                                      distinct key (or `null` to disable) when
 *                                      the builder is embedded inside a clinical
 *                                      record — a นัดวางแผนครอบครัว draft must not
 *                                      overwrite the คลังเอกสาร template draft.
 * All options are optional; omitting them keeps the original behaviour.
 */
export default function useFormBuilder(opts = {}) {
  const { blocks: seedBlocks, name: seedName, storageKey = DRAFT_STORAGE_KEY } = opts;
  /* seeded once — later edits live in state, not in the prop */
  const initialBlocks = useMemo(
    () => (seedBlocks && seedBlocks.length ? seedBlocks : createInitialBlocks()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [formName, setFormName] = useState(seedName || DEFAULT_FORM_NAME);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [selectedId, setSelectedId] = useState(initialBlocks[0]?.id ?? null);
  const [coverFiles, setCoverFiles] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [previewScrollKey, setPreviewScrollKey] = useState(0);

  const insertBlock = useCallback((kind, atIndex) => {
    const block = createBlockFromKind(kind);
    if (!block) return;
    setBlocks((prev) => {
      const next = [...prev];
      const idx = Math.max(0, Math.min(atIndex ?? prev.length, next.length));
      next.splice(idx, 0, block);
      return next;
    });
    setSelectedId(block.id);
    setPreviewScrollKey((k) => k + 1);
  }, []);

  const removeBlock = useCallback((id) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((b) => b.id !== id);
      setSelectedId((cur) => (cur === id ? next[0]?.id ?? null : cur));
      return next;
    });
  }, []);

  const duplicateBlock = useCallback((id) => {
    let newId = null;
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const copy = cloneBlock(prev[idx]);
      newId = copy.id;
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    if (newId) setSelectedId(newId);
  }, []);

  const updateBlock = useCallback((id, patch) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const reorderBlocks = useCallback((blockId, toIndex) => {
    setBlocks((prev) => reorderList(prev, blockId, toIndex));
  }, []);

  const addOption = useCallback((blockId) => {
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId || !b.options) return b;
      const n = b.options.length + 1;
      return {
        ...b,
        options: [...b.options, { id: `opt-${Date.now()}`, label: `ตัวเลือก ${n}` }],
      };
    }));
  }, []);

  const updateOption = useCallback((blockId, optionId, label) => {
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId || !b.options) return b;
      return {
        ...b,
        options: b.options.map((o) => (o.id === optionId ? { ...o, label } : o)),
      };
    }));
  }, []);

  const removeOption = useCallback((blockId, optionId) => {
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId || !b.options || b.options.length <= 1) return b;
      return { ...b, options: b.options.filter((o) => o.id !== optionId) };
    }));
  }, []);

  const saveDraft = useCallback(() => {
    const payload = {
      formName,
      blocks,
      coverFiles: coverFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      savedAt: new Date().toISOString(),
    };
    if (!storageKey) {
      /* embedded builder — the host owns persistence (e.g. the visit record) */
      setLastSaved(new Date());
      return true;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setLastSaved(new Date());
      return true;
    } catch {
      return false;
    }
  }, [formName, blocks, coverFiles, storageKey]);

  const publish = useCallback(() => {
    saveDraft();
    return { formName, blockCount: blocks.length, blocks };
  }, [saveDraft, formName, blocks]);

  const scrollPreviewToBlock = useCallback((id) => {
    setSelectedId(id);
    setPreviewScrollKey((k) => k + 1);
  }, []);

  const api = useMemo(() => ({
    formName,
    setFormName,
    blocks,
    selectedId,
    setSelectedId,
    coverFiles,
    setCoverFiles,
    lastSaved,
    previewScrollKey,
    insertBlock,
    removeBlock,
    duplicateBlock,
    updateBlock,
    reorderBlocks,
    addOption,
    updateOption,
    removeOption,
    saveDraft,
    publish,
    scrollPreviewToBlock,
  }), [
    formName, blocks, selectedId, coverFiles, lastSaved, previewScrollKey,
    insertBlock, removeBlock, duplicateBlock, updateBlock, reorderBlocks,
    addOption, updateOption, removeOption, saveDraft, publish, scrollPreviewToBlock,
  ]);

  return api;
}
