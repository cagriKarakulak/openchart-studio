import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Plus, Trash2, Clock, Download, Upload } from 'lucide-react';
import { SavedLayout, storageService } from '../../services/storage';
import { AppState } from '../../types';
import { useTranslation } from '../../i18n';

interface LayoutsModalProps {
  isOpen: boolean;
  currentState: AppState;
  onClose: () => void;
  onLoadLayout: (state: AppState) => void;
}

export const LayoutsModal: React.FC<LayoutsModalProps> = ({
  isOpen,
  currentState,
  onClose,
  onLoadLayout,
}) => {
  const { t, language } = useTranslation();
  const [layouts, setLayouts] = useState<SavedLayout[]>([]);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSavedList();
    }
  }, [isOpen]);

  const loadSavedList = async () => {
    const list = await storageService.getSavedLayouts();
    setLayouts(list.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  if (!isOpen) return null;

  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLayoutName.trim()) return;

    await storageService.saveNamedLayout(newLayoutName.trim(), currentState);
    setNewLayoutName('');
    setIsSaving(false);
    await loadSavedList();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t.modals.deleteLayoutTitle + '?')) {
      await storageService.deleteNamedLayout(id);
      await loadSavedList();
    }
  };

  const handleSelect = (layout: SavedLayout) => {
    onLoadLayout(layout.state);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-tv-surface border border-tv-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-tv-text text-xs"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-11 border-b border-tv-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-bold text-white text-sm">
            <FolderOpen className="w-4 h-4 text-tv-blue" />
            <span>{t.modals.layoutsTitle}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-tv-hover text-tv-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-tv-border bg-tv-card flex items-center justify-between">
          <span className="text-tv-muted">{t.modals.saveCurrentLayoutDesc}</span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => storageService.exportBackupToFile(currentState)}
              className="px-2 py-1 bg-tv-hover hover:text-white rounded font-medium flex items-center space-x-1 text-tv-muted"
              title={t.modals.downloadBackup}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.modals.downloadBackup}</span>
            </button>
            <label className="px-2 py-1 bg-tv-hover hover:text-white rounded font-medium flex items-center space-x-1 text-tv-muted cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{t.modals.uploadBackup}</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const state = await storageService.importBackupFromFile(file);
                      onLoadLayout(state);
                      onClose();
                    } catch (err) {
                      alert(`${t.common.error}: ${err}`);
                    }
                  }
                }}
              />
            </label>
            <button
              onClick={() => setIsSaving(!isSaving)}
              className="px-2.5 py-1 bg-tv-blue text-white rounded font-medium flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.modals.saveNewLayoutBtn}</span>
            </button>
          </div>
        </div>

        {isSaving && (
          <form onSubmit={handleSaveCurrent} className="p-3 border-b border-tv-border bg-tv-bg flex gap-2">
            <input
              type="text"
              placeholder={t.modals.layoutNamePlaceholder}
              value={newLayoutName}
              onChange={(e) => setNewLayoutName(e.target.value)}
              className="flex-1 bg-tv-card border border-tv-border rounded px-2.5 py-1 text-white focus:outline-none focus:border-tv-blue text-xs"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1 bg-tv-blue text-white rounded font-medium text-xs"
            >
              {t.common.save}
            </button>
          </form>
        )}

        <div className="max-h-[300px] overflow-y-auto divide-y divide-tv-border/30 p-2">
          {layouts.length === 0 ? (
            <div className="text-center py-10 text-tv-muted">
              {t.modals.noSavedLayouts}
            </div>
          ) : (
            layouts.map(item => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className="p-2.5 hover:bg-tv-hover rounded flex items-center justify-between cursor-pointer group transition-colors"
              >
                <div>
                  <div className="font-bold text-white text-sm group-hover:text-tv-blue transition-colors">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-tv-muted flex items-center space-x-2 mt-0.5">
                    <span className="font-mono bg-tv-card px-1 rounded">{item.state.layout}</span>
                    <span>{item.state.panes.length} {t.modals.chartsCount}</span>
                    <span className="flex items-center space-x-0.5">
                      <Clock className="w-2.5 h-2.5 inline" />
                      <span>{new Date(item.updatedAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-tv-blue text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.modals.loadLayoutBtn}
                  </span>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1 rounded text-tv-muted hover:text-tv-red opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t.modals.deleteLayoutTitle}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

