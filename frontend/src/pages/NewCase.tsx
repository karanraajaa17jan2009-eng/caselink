import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, AlertTriangle, CheckCircle2, Shield, ArrowRight,
  Sparkles, FileText, User, MapPin, Search
} from 'lucide-react';
import { api } from '../lib/api';
import { Bureau } from '../lib/types';
import { useAuth } from '../context/AuthContext';

export const NewCase: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form states
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<any | null>(null);
  const [institutionCandidates, setInstitutionCandidates] = useState<any[]>([]);
  const [isSearchingInst, setIsSearchingInst] = useState(false);

  // Manual raw fields if institution unlisted
  const [rawInstitutionName, setRawInstitutionName] = useState('');
  const [rawPermanentId, setRawPermanentId] = useState('');
  const [rawAddress, setRawAddress] = useState('');

  // Complaint details
  const [category, setCategory] = useState('Unapproved/Unauthorized Courses');
  const [priority, setPriority] = useState('Medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('Portal');
  const [complainantType, setComplainantType] = useState('Student');
  const [complainantName, setComplainantName] = useState('');
  const [complainantEmail, setComplainantEmail] = useState('');
  const [bureauId, setBureauId] = useState<number | undefined>(user?.bureau_id);

  // Overlap Precheck state
  const [precheckMatches, setPrecheckMatches] = useState<any[]>([]);
  const [isPrechecking, setIsPrechecking] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);

  // Load bureaus
  useEffect(() => {
    async function fetchBureaus() {
      try {
        const b = await api.get<Bureau[]>('/bureaus');
        setBureaus(b);
      } catch (err) {
        console.error(err);
      }
    }
    fetchBureaus();
  }, []);

  // Institution typeahead
  useEffect(() => {
    if (!institutionSearch.trim() || institutionSearch.length < 2) {
      setInstitutionCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingInst(true);
      try {
        const res = await api.get(`/institutions?search=${encodeURIComponent(institutionSearch)}&page_size=5`);
        setInstitutionCandidates(res.items || []);
      } catch (err) {
        console.error('Error fetching institutions', err);
      } finally {
        setIsSearchingInst(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [institutionSearch]);

  // Precheck for existing cases on same institution
  useEffect(() => {
    const instId = selectedInstitution?.id;
    if (!instId || (!subject && !description)) {
      setPrecheckMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsPrechecking(true);
      try {
        const textToMatch = `${subject} ${description}`.trim();
        const res = await api.get(`/overlaps/precheck?institution_id=${instId}&text=${encodeURIComponent(textToMatch)}`);
        if (res.has_matches) {
          setPrecheckMatches(res.potential_overlaps || []);
        } else {
          setPrecheckMatches([]);
        }
      } catch (err) {
        console.error('Precheck error', err);
      } finally {
        setIsPrechecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedInstitution, subject, description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        institution_id: selectedInstitution ? selectedInstitution.id : null,
        raw_institution_name: selectedInstitution ? selectedInstitution.name : rawInstitutionName,
        raw_permanent_id: selectedInstitution ? selectedInstitution.permanent_id : rawPermanentId,
        raw_address: selectedInstitution ? selectedInstitution.address : rawAddress,
        category,
        priority,
        subject,
        description,
        source,
        complainant_type: complainantType,
        complainant_name: complainantName || null,
        complainant_email: complainantEmail || null,
        current_bureau_id: bureauId || user?.bureau_id
      };

      const res = await api.post('/cases', payload);
      setSuccessResult(res);
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoriesList = [
    "Unapproved/Unauthorized Courses",
    "Admission Irregularities",
    "Excess/Illegal Fee Collection",
    "Faculty Shortage / Qualification",
    "Infrastructure Deficiency",
    "Fake Affiliation / Approval Claims",
    "Withholding of Certificates / Documents",
    "Harassment / Ragging",
    "Salary/Service Matters of Faculty",
    "Closure of Institution / Student Transfer",
    "Mandatory Disclosure Violation",
    "Other"
  ];

  if (successResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Complaint Registered Successfully</h2>
          <p className="text-sm text-slate-500">
            Case Number assigned and registered in the AICTE Single-Window National Repository:
          </p>
          <div className="inline-block px-4 py-2 bg-navy text-white font-mono font-bold text-lg rounded-xl shadow-sm">
            {successResult.case_no}
          </div>
        </div>

        {/* Overlap detection notification */}
        {successResult.new_overlaps && successResult.new_overlaps.length > 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-left space-y-2">
            <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-saffron shrink-0" />
              <span>Overlap Alert Generated ({successResult.new_overlaps.length} match detected)</span>
            </div>
            <p className="text-xs text-amber-700">
              The matching engine identified overlapping complaint(s) for this institution currently under process at another bureau. Both bureaus have been notified.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No active overlapping cases detected for this institution.
          </p>
        )}

        <div className="flex items-center justify-center space-x-4 pt-4">
          <button
            onClick={() => navigate(`/cases/${successResult.case_id}`)}
            className="px-5 py-2.5 bg-navy text-white text-xs font-bold rounded-lg hover:bg-navy-light shadow transition-all"
          >
            View Case Docket &rarr;
          </button>
          <button
            onClick={() => {
              setSuccessResult(null);
              setSelectedInstitution(null);
              setSubject('');
              setDescription('');
            }}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
          >
            Register Another Complaint
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-navy">Register New Institution Complaint</h1>
        <p className="text-xs text-slate-500">
          Enter grievance particulars. The integrated resolver will verify institution credentials and check cross-bureau overlap automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Institution Selection & Fuzzy Resolver */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Building className="w-4 h-4 text-navy" />
            <h3 className="text-sm font-bold text-slate-900">1. Institution Verification & Resolution</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select or Search Registered Institution
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={selectedInstitution ? `${selectedInstitution.name} (${selectedInstitution.permanent_id})` : institutionSearch}
                onChange={(e) => {
                  setSelectedInstitution(null);
                  setInstitutionSearch(e.target.value);
                }}
                placeholder="Type registered name, AICTE Permanent ID (e.g. 1-4821937...), or district..."
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              />
              {selectedInstitution && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInstitution(null);
                    setInstitutionSearch('');
                  }}
                  className="absolute right-3 top-2.5 text-xs text-red-600 font-semibold hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Candidate list */}
            {institutionCandidates.length > 0 && !selectedInstitution && (
              <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 overflow-hidden z-20">
                {institutionCandidates.map((cand) => (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => {
                      setSelectedInstitution(cand);
                      setInstitutionCandidates([]);
                    }}
                    className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{cand.name}</p>
                      <p className="text-slate-500 font-mono text-[11px]">AICTE ID: {cand.permanent_id} · {cand.district}, {cand.state}</p>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
                      Verified
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fallback manual fields if not in database */}
          {!selectedInstitution && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Can't find registered institution? Enter complainant's raw details:</span>
                <span className="text-[10px] text-saffron font-bold">Fuzzy resolver will resolve automatically</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    value={rawInstitutionName}
                    onChange={(e) => setRawInstitutionName(e.target.value)}
                    placeholder="Raw Institution Name (as written)"
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={rawPermanentId}
                    onChange={(e) => setRawPermanentId(e.target.value)}
                    placeholder="Raw AICTE ID (optional/if stated)"
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={rawAddress}
                    onChange={(e) => setRawAddress(e.target.value)}
                    placeholder="District / State / City"
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Pre-registration Duplicate Warning Banner */}
        {precheckMatches.length > 0 && (
          <div className="bg-amber-50 border-2 border-saffron rounded-2xl p-4 shadow-sm animate-in fade-in">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-saffron shrink-0 mt-0.5" />
              <div className="space-y-1 w-full">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Potential Overlap Detected with Existing Cases ({precheckMatches.length} match)
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  The institution already has active complaint(s) in this subject domain. Review existing cases below before registering to avoid redundant processing:
                </p>

                <div className="mt-2 space-y-1.5">
                  {precheckMatches.map((m) => (
                    <div key={m.case_id} className="p-2 bg-white/80 rounded-lg border border-amber-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-navy">{m.case_no}</span>
                        <span className="text-slate-400"> · Bureau: <strong>{m.bureau_code}</strong></span>
                        <p className="text-slate-700 truncate max-w-md">{m.subject}</p>
                      </div>
                      <span className="text-xs font-bold text-saffron">{m.similarity_score}% match</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Grievance Particulars */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <FileText className="w-4 h-4 text-navy" />
            <h3 className="text-sm font-bold text-slate-900">2. Grievance Category & Description</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
              >
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Priority (SLA Timeline)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
              >
                <option value="Critical">Critical (7 Days SLA)</option>
                <option value="High">High (15 Days SLA)</option>
                <option value="Medium">Medium (30 Days SLA)</option>
                <option value="Low">Low (45 Days SLA)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Receiving Bureau
              </label>
              <select
                value={bureauId || ''}
                onChange={(e) => setBureauId(Number(e.target.value))}
                className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
              >
                {bureaus.map(b => (
                  <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Complaint Subject / Headline
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Unauthorized B.Tech enrollment without AICTE approval"
              className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Detailed Grievance Narrative
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter comprehensive narrative including course names, fees paid, semester, or faculty names..."
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
            />
          </div>
        </div>

        {/* Section 4: Complainant & Source */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-navy" />
            <h3 className="text-sm font-bold text-slate-900">3. Complainant Details & Ingestion Source</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
              >
                <option value="Portal">AICTE Web Portal</option>
                <option value="CPGRAMS">CPGRAMS Central</option>
                <option value="Email">Official Email</option>
                <option value="Letter">Physical Letter</option>
                <option value="Walk-in">Walk-in Public Representation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Complainant Type
              </label>
              <select
                value={complainantType}
                onChange={(e) => setComplainantType(e.target.value)}
                className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
              >
                <option value="Student">Student</option>
                <option value="Faculty">Faculty</option>
                <option value="Parent">Parent</option>
                <option value="Staff">Staff</option>
                <option value="Other Stakeholder">Other Stakeholder</option>
                <option value="Anonymous">Anonymous</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Complainant Name
              </label>
              <input
                type="text"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                placeholder="Optional / Anonymous"
                className="w-full p-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={complainantEmail}
                onChange={(e) => setComplainantEmail(e.target.value)}
                placeholder="complainant@example.com"
                className="w-full p-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/cases')}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-navy hover:bg-navy-light text-white text-xs font-bold rounded-lg shadow transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Registering & Scanning...' : 'Submit & Ingest Complaint'}
          </button>
        </div>

      </form>

    </div>
  );
};
