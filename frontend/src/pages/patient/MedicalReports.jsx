import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Download,
  Eye,
  FileHeart,
  FileImage,
  FileText,
  HardDrive,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { recordService } from '../../services/healthService';
import { getApiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import Badge from '../../components/Badge';
import { InlineSpinner, SkeletonCard } from '../../components/Loader';
import {
  formatDate,
  formatFileSize,
  REPORT_TYPES,
  todayString,
  truncate,
} from '../../utils/format';
import { filenameFromResponse, saveBlob } from '../../utils/download';

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const defaultForm = () => ({
  title: '',
  type: 'Lab Report',
  description: '',
  recordDate: todayString(),
  tags: '',
});

const fileKind = (mimeType) => {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png') return 'png';
  return 'jpg';
};

export default function MedicalReports() {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setError('');
    try {
      const { data } = await recordService.list();
      setRecords(data.data.records);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(
    () => () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    },
    [preview?.url]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch =
        !term ||
        record.title.toLowerCase().includes(term) ||
        record.description?.toLowerCase().includes(term) ||
        record.type.toLowerCase().includes(term);
      const matchesType = !typeFilter || record.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [records, search, typeFilter]);

  const storage = useMemo(
    () => records.reduce((total, record) => total + (record.file?.size || 0), 0),
    [records]
  );

  const openUpload = () => {
    setForm(defaultForm());
    setFile(null);
    setFormError('');
    setProgress(0);
    setModalOpen(true);
  };

  const handleFile = (selected) => {
    if (!selected) return;
    setFormError('');

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setFormError('Please choose a PDF, JPG or PNG file.');
      return;
    }
    if (selected.size > MAX_SIZE) {
      setFormError('File is larger than 10MB. Please compress it or choose a smaller file.');
      return;
    }
    setFile(selected);
    if (!form.title) {
      const baseName = selected.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setForm((current) => ({ ...current, title: baseName }));
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const submitUpload = async () => {
    if (!file) {
      setFormError('Please attach a PDF, JPG or PNG report.');
      return;
    }
    if (!form.title.trim()) {
      setFormError('Give this report a clear title.');
      return;
    }

    setUploading(true);
    setFormError('');
    setProgress(0);

    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('title', form.title.trim());
      payload.append('type', form.type);
      payload.append('description', form.description.trim());
      payload.append('recordDate', form.recordDate);
      if (form.tags.trim()) payload.append('tags', form.tags.trim());

      await recordService.upload(payload, (event) => {
        if (event.total) {
          setProgress(Math.round((event.loaded * 100) / event.total));
        }
      });

      toast.success('Report uploaded securely', 'It’s now available in your private vault.');
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const downloadRecord = async (record) => {
    setDownloading(record._id);
    try {
      const response = await recordService.download(record._id);
      saveBlob(
        response.data,
        filenameFromResponse(response, record.file?.originalName || 'medical-report')
      );
      toast.success('Download started', 'Your report is downloading securely.');
    } catch (err) {
      toast.error('Download failed', getApiError(err));
    } finally {
      setDownloading('');
    }
  };

  const openPreview = async (record) => {
    try {
      const response = await recordService.download(record._id, true);
      const url = URL.createObjectURL(response.data);
      setPreview({ record, url });
    } catch (err) {
      toast.error('Preview failed', getApiError(err));
    }
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const deleteRecord = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await recordService.remove(deleteTarget._id);
      toast.success('Report deleted', 'The file was removed from your vault.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error('Could not delete report', getApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Private health vault"
        title="Medical reports"
        subtitle="A secure home for lab results, prescriptions and scans — organised, downloadable and visible only to the right people."
        actions={
          <button type="button" className="btn btn-primary" onClick={openUpload}>
            <Plus size={16} /> Upload report
          </button>
        }
      />

      <section className="records-summary">
        <div className="records-summary-item">
          <span className="records-summary-icon teal"><FileHeart size={20} /></span>
          <div><strong>{records.length}</strong><span>Reports stored</span></div>
        </div>
        <div className="records-summary-item">
          <span className="records-summary-icon blue"><HardDrive size={20} /></span>
          <div><strong>{formatFileSize(storage)}</strong><span>Secure storage used</span></div>
        </div>
        <div className="records-summary-item">
          <span className="records-summary-icon green"><CalendarDays size={20} /></span>
          <div>
            <strong>{records[0] ? formatDate(records[0].recordDate, 'short') : '—'}</strong>
            <span>Most recent report</span>
          </div>
        </div>
        <div className="records-summary-security">
          <ShieldCheck size={17} />
          <div>
            <strong>Private by design</strong>
            <span>Only you and doctors you’ve visited can access these files.</span>
          </div>
        </div>
      </section>

      <section className="card filters-card">
        <div className="filter-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search reports by title, type or description…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search reports"
          />
          {search && (
            <button type="button" className="input-action" onClick={() => setSearch('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="filter-controls">
          <label className="select-wrap">
            <FileText size={15} />
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by report type">
              <option value="">All report types</option>
              {REPORT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <span className="filter-count">{filtered.length} of {records.length} reports</span>
        </div>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="report-grid">
          {Array.from({ length: 6 }).map((_item, index) => <SkeletonCard key={index} height={240} />)}
        </div>
      ) : filtered.length ? (
        <div className="report-grid">
          {filtered.map((record) => {
            const kind = fileKind(record.file?.mimeType);
            return (
              <article className="report-card" key={record._id}>
                <div className="report-card-top">
                  <span className={`report-file-icon file-${kind}`}>
                    {kind === 'pdf' ? <FileText size={24} /> : <FileImage size={24} />}
                    <small>{kind.toUpperCase()}</small>
                  </span>
                  <Badge tone="neutral">{record.type}</Badge>
                </div>
                <h3>{record.title}</h3>
                {record.description ? (
                  <p>{truncate(record.description, 110)}</p>
                ) : (
                  <p className="muted-text">No description added.</p>
                )}
                <div className="report-meta">
                  <span><CalendarDays size={13} /> {formatDate(record.recordDate)}</span>
                  <span><HardDrive size={13} /> {formatFileSize(record.file?.size)}</span>
                </div>
                {record.tags?.length > 0 && (
                  <div className="report-tags">
                    {record.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                )}
                <div className="report-card-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => openPreview(record)}>
                    <Eye size={15} /> Preview
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => downloadRecord(record)}
                    disabled={downloading === record._id}
                    aria-label={`Download ${record.title}`}
                  >
                    <Download size={17} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => setDeleteTarget(record)}
                    aria-label={`Delete ${record.title}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={FileHeart}
            title={records.length ? 'No reports match your search' : 'Your medical vault is empty'}
            description={
              records.length
                ? 'Try a different search term or report type.'
                : 'Upload a PDF, JPG or PNG and keep every important result in one secure place.'
            }
            action={
              records.length ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setTypeFilter(''); }}>
                  Clear filters
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={openUpload}>
                  <UploadCloud size={15} /> Upload your first report
                </button>
              )
            }
          />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => (uploading ? null : setModalOpen(false))}
        title="Upload a medical report"
        subtitle="PDF, JPG or PNG · maximum 10MB · encrypted in transit"
        icon={UploadCloud}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={uploading}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submitUpload} disabled={uploading || !file}>
              {uploading ? <><InlineSpinner size={16} /> Uploading {progress}%</> : <><UploadCloud size={16} /> Upload securely</>}
            </button>
          </>
        }
      >
        <div
          className={`upload-dropzone ${dragActive ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input
            id="report-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={(event) => handleFile(event.target.files?.[0])}
            hidden
          />
          {file ? (
            <div className="upload-file-preview">
              <span className={`report-file-icon file-${fileKind(file.type)}`}>
                {file.type === 'application/pdf' ? <FileText size={22} /> : <FileImage size={22} />}
              </span>
              <div>
                <strong>{file.name}</strong>
                <span>{formatFileSize(file.size)} · ready to upload</span>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFile(null)}>
                Remove
              </button>
            </div>
          ) : (
            <>
              <span className="upload-icon"><UploadCloud size={30} /></span>
              <h3>Drag & drop your report here</h3>
              <p>or choose a file from your device</p>
              <label htmlFor="report-file" className="btn btn-secondary btn-sm">
                Browse files
              </label>
              <small>PDF, JPG, PNG · up to 10MB</small>
            </>
          )}
        </div>

        {uploading && (
          <div className="upload-progress">
            <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
            <span>{progress}% uploaded</span>
          </div>
        )}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="report-title">Report title</label>
            <input
              id="report-title"
              value={form.title}
              maxLength={150}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="e.g. Complete blood count — June"
            />
          </div>
          <div className="field">
            <label htmlFor="report-type">Report type</label>
            <select
              id="report-type"
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            >
              {REPORT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="report-date">Report date</label>
            <input
              id="report-date"
              type="date"
              max={todayString()}
              value={form.recordDate}
              onChange={(event) => setForm((current) => ({ ...current, recordDate: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="report-tags">Tags <span className="optional">(optional)</span></label>
            <input
              id="report-tags"
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="blood, annual, fasting"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="report-description">Notes <span className="optional">(optional)</span></label>
          <textarea
            id="report-description"
            rows={3}
            maxLength={500}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Add context for your doctor — what the test was for, or anything they should know."
          />
        </div>

        {formError && <div className="form-alert">{formError}</div>}
      </Modal>

      <Modal
        open={Boolean(preview)}
        onClose={closePreview}
        title={preview?.record?.title || 'Report preview'}
        subtitle={preview ? `${preview.record.type} · ${formatDate(preview.record.recordDate)}` : ''}
        icon={Eye}
        size="xl"
        footer={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => preview && downloadRecord(preview.record)}
          >
            <Download size={16} /> Download
          </button>
        }
      >
        {preview && (
          <div className="report-preview">
            {preview.record.file?.mimeType === 'application/pdf' ? (
              <iframe src={preview.url} title={preview.record.title} className="pdf-preview" />
            ) : (
              <img src={preview.url} alt={preview.record.title} />
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteRecord}
        title={`Delete “${deleteTarget?.title || 'this report'}”?`}
        description="The file will be permanently removed from your secure vault. This cannot be undone."
        confirmLabel="Delete report"
        loading={deleting}
      />
    </div>
  );
}
