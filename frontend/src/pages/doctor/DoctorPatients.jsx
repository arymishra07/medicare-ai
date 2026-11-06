import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Download,
  Droplets,
  FileHeart,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { doctorService } from '../../services/doctorService';
import { recordService } from '../../services/healthService';
import { getApiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import Modal from '../../components/Modal';
import { InlineSpinner, SkeletonCard } from '../../components/Loader';
import {
  calculateAge,
  formatDate,
  formatFileSize,
  formatRelativeDay,
  formatTime,
  STATUS_META,
} from '../../utils/format';
import { filenameFromResponse, saveBlob } from '../../utils/download';

export default function DoctorPatients() {
  const toast = useToast();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloading, setDownloading] = useState('');

  const load = async () => {
    setError('');
    try {
      const { data } = await doctorService.myPatients();
      setPatients(data.data.patients);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((entry) =>
      [entry.patient?.name, entry.patient?.email, entry.patient?.phone]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [patients, search]);

  const openPatient = async (patient) => {
    setSelected(patient);
    setDetail(null);
    setDetailLoading(true);
    try {
      const { data } = await doctorService.patientDetail(patient._id);
      setDetail(data.data);
    } catch (err) {
      toast.error('Could not load patient', getApiError(err));
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closePatient = () => {
    setSelected(null);
    setDetail(null);
  };

  const downloadRecord = async (record) => {
    setDownloading(record._id);
    try {
      const response = await recordService.download(record._id);
      saveBlob(
        response.data,
        filenameFromResponse(response, record.file?.originalName || 'medical-report')
      );
      toast.success('Report downloaded', 'Access was recorded in the audit log.');
    } catch (err) {
      toast.error('Download failed', getApiError(err));
    } finally {
      setDownloading('');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Continuity of care"
        title="My patients"
        subtitle="A focused view of the patients you’ve seen — with only the information needed to support their care."
        actions={
          <div className="table-search header-search">
            <Search size={16} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patients…"
              aria-label="Search patients"
            />
          </div>
        }
      />

      <div className="privacy-banner">
        <ShieldCheck size={18} />
        <p>
          You can only view patients who have booked an appointment with you. Record downloads are
          logged for everyone’s protection.
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="patient-grid">
          {Array.from({ length: 6 }).map((_item, index) => <SkeletonCard key={index} height={250} />)}
        </div>
      ) : filtered.length ? (
        <div className="patient-grid">
          {filtered.map((entry) => {
            const patient = entry.patient;
            const age = calculateAge(patient?.dateOfBirth);
            return (
              <article className="patient-card" key={patient._id}>
                <div className="patient-card-head">
                  <Avatar name={patient.name} size="lg" />
                  <div>
                    <h3>{patient.name}</h3>
                    <span>{age ? `${age} years` : 'Age not provided'}{patient.gender && patient.gender !== 'prefer_not_to_say' ? ` · ${patient.gender}` : ''}</span>
                  </div>
                  {entry.nextVisit && <Badge tone="teal">Upcoming</Badge>}
                </div>

                <div className="patient-contact">
                  <span><Mail size={13} /> {patient.email}</span>
                  <span><Phone size={13} /> {patient.phone || 'Phone not provided'}</span>
                </div>

                <div className="patient-stats">
                  <div><strong>{entry.totalVisits}</strong><span>Visits</span></div>
                  <div><strong>{entry.completedVisits}</strong><span>Completed</span></div>
                  <div><strong>{entry.recordsCount}</strong><span>Reports</span></div>
                </div>

                <div className="patient-dates">
                  <span><CalendarClock size={13} /> Last visit: {entry.lastVisit ? formatDate(entry.lastVisit, 'short') : '—'}</span>
                  {entry.nextVisit && <span>Next: {formatRelativeDay(entry.nextVisit)}</span>}
                </div>

                {entry.lastReason && <p className="patient-reason">Last concern: {entry.lastReason}</p>}

                <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={() => openPatient(patient)}>
                  <UserRound size={15} /> View patient details
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={UsersRound}
            title={search ? 'No patients match your search' : 'No patients yet'}
            description={
              search
                ? 'Try a different name, email or phone number.'
                : 'Patients will appear here after they book an appointment with you.'
            }
            action={search ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearch('')}>Clear search</button> : undefined}
          />
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={closePatient}
        title={selected?.name || 'Patient details'}
        subtitle="Permitted patient information"
        icon={UserRound}
        size="lg"
      >
        {detailLoading ? (
          <div className="modal-loading"><InlineSpinner size={24} /> Loading patient record…</div>
        ) : detail ? (
          <div className="patient-detail">
            <div className="patient-detail-head">
              <Avatar name={detail.patient.name} size="lg" />
              <div>
                <h3>{detail.patient.name}</h3>
                <span>{detail.patient.email} · {detail.patient.phone || 'No phone'}</span>
                <div className="patient-badges">
                  {detail.patient.bloodGroup && <Badge tone="danger"><Droplets size={12} /> {detail.patient.bloodGroup}</Badge>}
                  {detail.patient.gender && detail.patient.gender !== 'prefer_not_to_say' && <Badge tone="neutral">{detail.patient.gender}</Badge>}
                  {calculateAge(detail.patient.dateOfBirth) && <Badge tone="neutral">{calculateAge(detail.patient.dateOfBirth)} years</Badge>}
                </div>
              </div>
            </div>

            <div className="patient-detail-grid">
              <div><span>Email</span><strong>{detail.patient.email}</strong></div>
              <div><span>Phone</span><strong>{detail.patient.phone || 'Not provided'}</strong></div>
              <div><span>Date of birth</span><strong>{detail.patient.dateOfBirth ? formatDate(detail.patient.dateOfBirth, 'long') : 'Not provided'}</strong></div>
              <div><span>Emergency contact</span><strong>{detail.patient.emergencyContact || 'Not provided'}</strong></div>
              <div className="span-2"><span>Address</span><strong>{detail.patient.address || 'Not provided'}</strong></div>
            </div>

            <div className="detail-section">
              <div className="detail-section-head">
                <h4>Appointment history</h4>
                <span>{detail.appointments.length} total</span>
              </div>
              {detail.appointments.length ? (
                <div className="history-list">
                  {detail.appointments.slice(0, 6).map((appointment) => (
                    <div className="history-row" key={appointment._id}>
                      <div className="history-date">
                        <strong>{formatDate(appointment.date, 'short')}</strong>
                        <span>{formatTime(appointment.startTime)}</span>
                      </div>
                      <div className="history-copy">
                        <strong>{appointment.reason}</strong>
                        {appointment.doctorNotes && <small>{appointment.doctorNotes}</small>}
                      </div>
                      <Badge tone={STATUS_META[appointment.status]?.tone} dot>
                        {STATUS_META[appointment.status]?.label}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">No appointment history yet.</p>
              )}
            </div>

            <div className="detail-section">
              <div className="detail-section-head">
                <h4>Medical reports</h4>
                <span className="secure-label"><ShieldCheck size={12} /> Access logged</span>
              </div>
              {detail.records.length ? (
                <div className="history-list">
                  {detail.records.map((record) => (
                    <div className="history-row" key={record._id}>
                      <span className={`file-icon file-${record.file?.mimeType === 'application/pdf' ? 'pdf' : 'image'}`}>
                        <FileHeart size={17} />
                      </span>
                      <div className="history-copy">
                        <strong>{record.title}</strong>
                        <small>{record.type} · {formatDate(record.recordDate)} · {formatFileSize(record.file?.size)}</small>
                      </div>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => downloadRecord(record)}
                        disabled={downloading === record._id}
                        aria-label={`Download ${record.title}`}
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">This patient has not uploaded any reports.</p>
              )}
            </div>

            {detail.patient.address && (
              <div className="inline-note info">
                <MapPin size={15} /> {detail.patient.address}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
