import React, { useState } from 'react';
import { 
  UploadCloud, Download, CheckCircle2, AlertTriangle, 
  FileSpreadsheet, ArrowRight, RefreshCw, Layers
} from 'lucide-react';
import { api } from '../lib/api';

export const ImportWizard: React.FC = () => {
  const [importKind, setImportKind] = useState<'institutions' | 'cases'>('institutions');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    window.open(`/api/import/template/${importKind}`, '_blank');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg(null);
      setImportResult(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMsg(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await api.post(`/import/${importKind}`, formData);
      setImportResult(res);
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Import failed. Please check CSV format.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-navy">Regulatory Data Ingestion Wizard</h1>
        <p className="text-xs text-slate-500">
          Bulk load AICTE approved technical institutions or legacy grievances with schema validation and duplicate skipping.
        </p>
      </div>

      {/* Switcher & Template download */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => { setImportKind('institutions'); setImportResult(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              importKind === 'institutions'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Institutions Master List
          </button>
          <button
            type="button"
            onClick={() => { setImportKind('cases'); setImportResult(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              importKind === 'cases'
                ? 'bg-navy text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Complaints & Grievances
          </button>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 text-navy hover:bg-slate-100 text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-saffron" />
          <span>Download {importKind.toUpperCase()} CSV Template</span>
        </button>
      </div>

      {/* Upload Drop Zone */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-navy transition-colors bg-slate-50/50">
            <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">
              Select or Drop {importKind === 'institutions' ? 'Institutions' : 'Complaints'} CSV File
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Columns are strictly validated against AICTE regulatory schema.
            </p>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              id="file-input"
              className="hidden"
            />
            <label
              htmlFor="file-input"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-navy" />
              <span>Browse Local CSV File</span>
            </label>

            {selectedFile && (
              <p className="text-xs font-bold text-navy mt-3">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="px-6 py-2.5 bg-navy hover:bg-navy-light text-white text-xs font-bold rounded-lg shadow disabled:opacity-40 transition-all cursor-pointer flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing & Validating Data...</span>
                </>
              ) : (
                <>
                  <span>Execute Ingestion Job</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>

      {/* Results Summary Card */}
      {importResult && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-emerald-700">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Ingestion Job Completed</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Rows</span>
              <p className="text-xl font-bold text-slate-800">{importResult.total_rows}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-600">Successfully Ingested</span>
              <p className="text-xl font-bold text-emerald-800">{importResult.inserted}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-amber-600">Duplicates Skipped</span>
              <p className="text-xl font-bold text-amber-800">{importResult.skipped}</p>
            </div>
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-1 text-xs text-red-700">
              <p className="font-bold">Row-level Validation Warnings ({importResult.errors.length}):</p>
              <ul className="list-disc pl-5 space-y-0.5 max-h-32 overflow-y-auto font-mono text-[11px]">
                {importResult.errors.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
