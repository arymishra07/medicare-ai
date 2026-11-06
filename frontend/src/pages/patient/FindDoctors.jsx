import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Search, SlidersHorizontal, Sparkles, Stethoscope, X } from 'lucide-react';
import { doctorService } from '../../services/doctorService';
import { getApiError } from '../../services/api';
import DoctorCard from '../../components/DoctorCard';
import BookingModal from '../../components/BookingModal';
import PageHeader from '../../components/PageHeader';
import EmptyState, { ErrorState } from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Loader';

export default function FindDoctors() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [doctorsResponse, specialtiesResponse] = await Promise.all([
        doctorService.list(),
        doctorService.specializations(),
      ]);
      setDoctors(doctorsResponse.data.data.doctors);
      setSpecializations(specialtiesResponse.data.data.specializations);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const locations = useMemo(
    () => [...new Set(doctors.map((doctor) => doctor.location).filter(Boolean))].sort(),
    [doctors]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return doctors.filter((doctor) => {
      const matchesSearch =
        !term ||
        [doctor.name, doctor.specialization, doctor.hospital, doctor.location, doctor.bio]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      const matchesSpecialty = !specialty || doctor.specialization === specialty;
      const matchesLocation = !location || doctor.location === location;
      return matchesSearch && matchesSpecialty && matchesLocation;
    });
  }, [doctors, search, specialty, location]);

  const activeFilters = Boolean(search || specialty || location);
  const clearFilters = () => {
    setSearch('');
    setSpecialty('');
    setLocation('');
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Doctor directory"
        title="Find the right specialist"
        subtitle="Verified professionals, transparent fees and live availability — choose care that fits your life."
      />

      <section className="doctor-hero-strip">
        <div className="doctor-hero-icon"><Sparkles size={22} /></div>
        <div>
          <strong>{doctors.length || '—'} verified specialists across {specializations.filter((item) => item.doctors > 0).length || '—'} specialties</strong>
          <p>Every profile is reviewed by our admin team. Appointment slots update in real time.</p>
        </div>
        <div className="doctor-hero-pills">
          <span><span className="live-dot" /> Live availability</span>
          <span>Secure booking</span>
        </div>
      </section>

      <section className="card filters-card">
        <div className="filter-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search by doctor, specialty, hospital or city…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search doctors"
          />
          {search && (
            <button type="button" className="input-action" onClick={() => setSearch('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="filter-controls">
          <label className="select-wrap">
            <SlidersHorizontal size={15} />
            <select value={specialty} onChange={(event) => setSpecialty(event.target.value)} aria-label="Filter by specialty">
              <option value="">All specialties</option>
              {specializations.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}{item.doctors ? ` (${item.doctors})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="select-wrap">
            <Filter size={15} />
            <select value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Filter by city">
              <option value="">All cities</option>
              {locations.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          {activeFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={14} /> Clear filters
            </button>
          )}
        </div>
      </section>

      {!loading && !error && (
        <div className="specialty-pills">
          <button
            type="button"
            className={`specialty-pill ${!specialty ? 'active' : ''}`}
            onClick={() => setSpecialty('')}
          >
            All care
          </button>
          {specializations.filter((item) => item.doctors > 0).map((item) => (
            <button
              type="button"
              key={item.name}
              className={`specialty-pill ${specialty === item.name ? 'active' : ''}`}
              onClick={() => setSpecialty(specialty === item.name ? '' : item.name)}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="doctor-grid">
          {Array.from({ length: 6 }).map((_item, index) => <SkeletonCard key={index} height={310} />)}
        </div>
      ) : filtered.length ? (
        <>
          <div className="results-bar">
            <span><Stethoscope size={15} /> {filtered.length} specialist{filtered.length === 1 ? '' : 's'} available</span>
            <span className="results-hint">Book instantly · no hidden fees</span>
          </div>
          <div className="doctor-grid">
            {filtered.map((doctor) => (
              <DoctorCard key={doctor._id} doctor={doctor} onBook={setSelectedDoctor} />
            ))}
          </div>
        </>
      ) : (
        <div className="card">
          <EmptyState
            icon={Search}
            title="No doctors match those filters"
            description="Try a different specialty, city or search term — or clear all filters to see everyone."
            action={<button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear filters</button>}
          />
        </div>
      )}

      <BookingModal
        open={Boolean(selectedDoctor)}
        doctor={selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        onSuccess={() => navigate('/patient/appointments')}
      />
    </div>
  );
}
