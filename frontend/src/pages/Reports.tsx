import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Download, Printer, Filter, Table, 
  FileSpreadsheet, Sparkles, Building, Layers
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { api } from '../lib/api';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<string>('bureau-wise');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/reports/${reportType}`);
      setData(Array.isArray(res) ? res : res.cases || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handleExportCsv = () => {
    window.open(`/api/reports/${reportType}?format=csv`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const reportOptions = [
    { id: 'bureau-wise', label: 'Bureau & Cell Performance' },
    { id: 'region-wise', label: 'Regional Office Distribution' },
    { id: 'status-wise', label: 'Complaint Status Breakdown' },
    { id: 'category-wise', label: 'Grievance Category Ranking' },
    { id: 'ageing', label: 'Ageing Profile (Time in System)' },
    { id: 'disposal-rate', label: 'Quarterly Disposal Rate Analysis' },
    { id: 'overlaps', label: 'Cross-Bureau Overlap Master Report' },
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Print-Only Official AICTE Letterhead Header */}
      <div className="print-only mb-6 border-b-2 border-navy pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-navy">ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</h1>
            <p className="text-xs text-slate-600">Regulation Bureau · Public Grievance Redressal Monitoring Cell</p>
            <p className="text-xs text-slate-500 font-medium">Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>CASELINK System Generated Report</p>
            <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-navy">Regulatory Analytics & Report Builder</h1>
          <p className="text-xs text-slate-500">
            Export official regulatory performance reports, regional audits, and cross-bureau resolution statistics.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-navy text-white hover:bg-navy-light text-xs font-bold rounded-lg shadow transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Report Selection Switcher */}
      <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-1.5 text-xs">
        {reportOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setReportType(opt.id)}
            className={`px-3 py-2 rounded-xl font-medium transition-all cursor-pointer ${
              reportType === opt.id
                ? 'bg-navy text-white font-bold shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Visual Chart Preview */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Visual Analytics: {reportOptions.find(o => o.id === reportType)?.label}
        </h3>

        <div className="h-64 pt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Generating visualization...
            </div>
          ) : data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              No data available for this parameter.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {reportType === 'bureau-wise' ? (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bureau_code" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total_cases" name="Total Inflow" fill="#1F3A6E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="disposed_cases" name="Disposed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue_cases" name="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : reportType === 'region-wise' ? (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="region_name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total_cases" name="Total Cases" fill="#F28C28" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="open_cases" name="Open" fill="#1F3A6E" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : reportType === 'ageing' ? (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Open Cases" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={data.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey={reportType === 'category-wise' ? 'category' : reportType === 'status-wise' ? 'status' : 'period'} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey={reportType === 'disposal-rate' ? 'disposal_rate' : 'count'} fill="#1F3A6E" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabular Data View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Tabular Records ({data.length} rows)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
              <tr>
                {data.length > 0 && Object.keys(data[0]).map((col) => (
                  <th key={col} className="p-3">{col.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  {Object.values(row).map((val: any, cIdx) => (
                    <td key={cIdx} className="p-3 font-medium text-slate-800">
                      {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val ?? 'N/A')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
