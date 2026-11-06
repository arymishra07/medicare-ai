import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  Stethoscope,
  Video,
} from 'lucide-react';
import Modal from './Modal';
import { InlineSpinner } from './Loader';
import { useToast } from '../context/ToastContext';
import { doctorService } from '../services/doctorService';
import { appointmentService } from '../services/appointmentService';
import { getApiError } from '../services/api';
import {
  addDays,
  formatCurrency,
  formatDate,
  formatTime,
  todayString,
} from '../utils/format';

export default function BookingModal({
  open,
  onClose,
  doctor,
  appointment = null,
  onSuccess,
}) {
  const toast = useToast();
  const isReschedule = Boolean(appointment);
  const activeDoctor = isReschedule ? appointment.doctor : doctor;
  const doctorId = activeDoctor?._id;

  const today = todayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [slots, setSlots] = useState([]);
  const [slotReason, setSlotReason] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [type, setType] = useState('in-person');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const autoAdvancedRef = useRef(false);

  const quickDates = useMemo(
    () => Array.from({ length: 7 }, (_value, index) => addDays(today, index)),
    [today]
  );

  useEffect(() => {
    if (!open) return;
    const initialDate =
      appointment?.date && appointment.date >= today ? appointment.date : today;
    setSelectedDate(initialDate);
    setSelectedSlot('');
    setReason('');
    setSymptoms('');
    setType(appointment?.type || 'in-person');
    setError('');
    setSlots([]);
    setSlotReason('');
    autoAdvancedRef.current = false;
  }, [open, doctorId, appointment?._id, appointment?.date, appointment?.type, today]);

  useEffect(() => {
    if (!open || !doctorId) return undefined;
    let active = true;

    const load = async () => {
      setLoadingSlots(true);
      setSelectedSlot('');
      setError('');
      try {
        const { data } = await doctorService.slots(doctorId, selectedDate);
        if (!active) return;
        const loadedSlots = data.data.slots || [];
        setSlots(loadedSlots);
        setSlotReason(data.data.reason || '');

        // If today's slots have already passed, gently move to the next
        // bookable day so the booking form opens ready to use.
        if (
          selectedDate === today &&
          loadedSlots.length === 0 &&
          !autoAdvancedRef.current
        ) {
          autoAdvancedRef.current = true;
          for (const candidate of quickDates.slice(1)) {
            try {
              const { data: next } = await doctorService.slots(doctorId, candidate);
              if (!active) return;
              if ((next.data.slots || []).length) {
                setSelectedDate(candidate);
                break;
              }
            } catch {
              break;
            }
          }
        }
      } catch (err) {
        if (active) {
          setSlots([]);
          setError(getApiError(err));
        }
      } finally {
        if (active) setLoadingSlots(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [open, doctorId, selectedDate, today, quickDates]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!selectedSlot) {
      setError('Please choose an available time slot.');
      return;
    }
    if (!isReschedule && reason.trim().length < 5) {
      setError('Please share a short reason for your visit (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    try {
      if (isReschedule) {
        await appointmentService.reschedule(appointment._id, {
          date: selectedDate,
          startTime: selectedSlot,
          reason: reason.trim(),
        });
        toast.success('Appointment rescheduled', 'The new time is awaiting doctor confirmation.');
      } else {
        await appointmentService.create({
          doctorId,
          date: selectedDate,
          startTime: selectedSlot,
          reason: reason.trim(),
          symptoms: symptoms.trim(),
          type,
        });
        toast.success(
          'Appointment requested',
          `${activeDoctor?.name} will review your request. You’ll be notified once confirmed.`
        );
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={isReschedule ? 'Reschedule appointment' : 'Book an appointment'}
      subtitle={
        isReschedule
          ? 'Choose a new time. The doctor will need to confirm the change.'
          : 'Select a date and an available time that works for you.'
      }
      icon={CalendarDays}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || loadingSlots || !selectedSlot}
          >
            {submitting ? (
              <>
                <InlineSpinner size={16} /> {isReschedule ? 'Rescheduling…' : 'Requesting…'}
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> {isReschedule ? 'Confirm new time' : 'Request appointment'}
              </>
            )}
          </button>
        </>
      }
    >
      <div className="booking-doctor">
        <span className="booking-doctor-icon">
          <Stethoscope size={22} />
        </span>
        <div>
          <strong>{activeDoctor?.name}</strong>
          <span>
            {activeDoctor?.specialization}
            {activeDoctor?.hospital ? ` · ${activeDoctor.hospital}` : ''}
          </span>
          {activeDoctor?.location && (
            <small><MapPin size={12} /> {activeDoctor.location}</small>
          )}
        </div>
        <div className="booking-fee">
          <small>Consultation fee</small>
          <strong>{formatCurrency(activeDoctor?.consultationFee)}</strong>
        </div>
      </div>

      {isReschedule && appointment && (
        <div className="current-appointment-note">
          <Clock3 size={15} />
          Currently scheduled for {formatDate(appointment.date)} at {formatTime(appointment.startTime)}
        </div>
      )}

      <form onSubmit={handleSubmit} className="booking-form">
        <div className="field">
          <label>Choose a date</label>
          <div className="quick-dates">
            {quickDates.map((date, index) => {
              const dateObject = new Date(`${date}T00:00:00`);
              return (
                <button
                  type="button"
                  key={date}
                  className={`quick-date ${selectedDate === date ? 'active' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <span>{index === 0 ? 'Today' : dateObject.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <strong>{dateObject.getDate()}</strong>
                  <small>{dateObject.toLocaleDateString('en-US', { month: 'short' })}</small>
                </button>
              );
            })}
          </div>
          <div className="date-picker-row">
            <CalendarDays size={16} />
            <input
              type="date"
              value={selectedDate}
              min={today}
              max={addDays(today, 90)}
              onChange={(event) => setSelectedDate(event.target.value || today)}
            />
            <span className="field-hint">Up to 90 days ahead</span>
          </div>
        </div>

        <div className="field">
          <label>Available times</label>
          {loadingSlots ? (
            <div className="slots-loading">
              <InlineSpinner size={18} /> Checking the doctor’s calendar…
            </div>
          ) : slots.length ? (
            <div className="slot-grid">
              {slots.map((slot) => (
                <button
                  type="button"
                  key={slot.startTime}
                  className={`slot-btn ${selectedSlot === slot.startTime ? 'selected' : ''}`}
                  onClick={() => setSelectedSlot(slot.startTime)}
                >
                  {formatTime(slot.startTime)}
                </button>
              ))}
            </div>
          ) : (
            <div className="slots-empty">
              <Clock3 size={18} />
              <p>{slotReason || 'No open slots on this date. Try another day.'}</p>
            </div>
          )}
        </div>

        {!isReschedule && (
          <>
            <div className="field">
              <label>Consultation type</label>
              <div className="type-options">
                <label className={`type-option ${type === 'in-person' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="type"
                    value="in-person"
                    checked={type === 'in-person'}
                    onChange={() => setType('in-person')}
                  />
                  <Stethoscope size={18} />
                  <span>
                    <strong>In-person visit</strong>
                    <small>Meet at the clinic</small>
                  </span>
                </label>
                <label className={`type-option ${type === 'video' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="type"
                    value="video"
                    checked={type === 'video'}
                    onChange={() => setType('video')}
                  />
                  <Video size={18} />
                  <span>
                    <strong>Video consultation</strong>
                    <small>Discuss from home</small>
                  </span>
                </label>
              </div>
            </div>

            <div className="field">
              <label htmlFor="booking-reason">Reason for visit <span>*</span></label>
              <textarea
                id="booking-reason"
                rows={3}
                placeholder="Briefly describe the concern you’d like to discuss…"
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="booking-symptoms">Symptoms <span className="optional">(optional)</span></label>
              <input
                id="booking-symptoms"
                type="text"
                placeholder="e.g. mild headache for 3 days"
                value={symptoms}
                maxLength={500}
                onChange={(event) => setSymptoms(event.target.value)}
              />
            </div>
          </>
        )}

        {isReschedule && (
          <div className="field">
            <label htmlFor="reschedule-note">Reason for change <span className="optional">(optional)</span></label>
            <textarea
              id="reschedule-note"
              rows={2}
              placeholder="Let the doctor know why you need a new time…"
              value={reason}
              maxLength={400}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        )}

        {error && <div className="form-alert">{error}</div>}

        {selectedSlot && (
          <div className="booking-summary">
            <CreditCard size={17} />
            <div>
              <strong>{formatDate(selectedDate)} at {formatTime(selectedSlot)}</strong>
              <span>
                {activeDoctor?.name} · {formatCurrency(activeDoctor?.consultationFee)} consultation fee
              </span>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
