import { CalendarClock, CheckCircle2, MapPin, Star, Video } from 'lucide-react';
import Avatar from './Avatar';
import Badge from './Badge';
import { formatCurrency, WEEK_DAYS } from '../utils/format';

const availabilityLabel = (days = []) => {
  if (!days.length) return 'Availability on request';
  const names = days.map((day) => WEEK_DAYS[day]?.slice(0, 3));
  return names.join(' · ');
};

export default function DoctorCard({ doctor, onBook, compact = false }) {
  return (
    <article className={`doctor-card ${compact ? 'doctor-card-compact' : ''}`}>
      <div className="doctor-card-top">
        <Avatar name={doctor.name} size="lg" />
        <div className="doctor-identity">
          <div className="doctor-name-row">
            <h3>{doctor.name}</h3>
            {doctor.isVerified && (
              <span className="verified-mark" title="Verified professional">
                <CheckCircle2 size={15} />
              </span>
            )}
          </div>
          <p className="doctor-specialty">{doctor.specialization}</p>
          <div className="doctor-rating">
            <Star size={14} fill="currentColor" />
            <strong>{doctor.rating?.toFixed(1) || '4.7'}</strong>
            <span>({doctor.reviewsCount || 0} reviews)</span>
          </div>
        </div>
      </div>

      <div className="doctor-meta">
        <span>
          <MapPin size={14} /> {doctor.hospital || 'MediCare Partner Clinic'}
          {doctor.location ? `, ${doctor.location}` : ''}
        </span>
        <span>
          <CalendarClock size={14} /> {doctor.experienceYears || 0} years experience
        </span>
      </div>

      {!compact && doctor.bio && <p className="doctor-bio">{doctor.bio}</p>}

      <div className="availability-chip">
        <span className="availability-dot" />
        {availabilityLabel(doctor.availableDays)}
      </div>

      <div className="doctor-card-footer">
        <div className="consult-fee">
          <small>Consultation</small>
          <strong>{formatCurrency(doctor.consultationFee)}</strong>
        </div>
        <div className="doctor-actions">
          <Badge tone="teal">
            <Video size={12} /> Online booking
          </Badge>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onBook?.(doctor)}>
            Book appointment
          </button>
        </div>
      </div>
    </article>
  );
}
